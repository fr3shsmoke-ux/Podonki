#!/usr/bin/env node

/**
 * Batch generate multiple B2C posts
 * Usage: node scripts/batch-generate.js [count]
 */

import db from '../src/db/podonki-db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Load topics
const topicsPath = path.join(__dirname, '../data/b2c-rubric-topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));

const count = parseInt(process.argv[2]) || 3;

async function generateBatch() {
  try {
    console.log('\n📚 ПАКЕТНАЯ ГЕНЕРАЦИЯ ПОСТОВ');
    console.log('═'.repeat(60));
    console.log(`Генерирую ${count} постов...\n`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      try {
        const rubric = selectRandomRubric();
        const topic = selectTopic(rubric);
        const product = selectRandomProduct();

        console.log(`\n[${i + 1}/${count}] 📋 ${rubric.name}`);
        console.log(`       🎯 ${topic}`);

        const post = await generateSinglePost(rubric, topic, product);
        results.push({
          success: true,
          rubric: rubric.name,
          product: product?.name || 'auto',
          text: post.text,
          tokens: post.tokens
        });

        console.log(`       ✅ Готово (${post.tokens} токенов)`);

      } catch (error) {
        console.log(`       ❌ Ошибка: ${error.message}`);
        results.push({
          success: false,
          error: error.message
        });
      }

      // Small delay to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    const endTime = Date.now();
    const successful = results.filter(r => r.success).length;
    const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 ИТОГИ ГЕНЕРАЦИИ');
    console.log('═'.repeat(60));
    console.log(`✅ Успешно: ${successful}/${count}`);
    console.log(`⏱️  Время: ${((endTime - startTime) / 1000).toFixed(1)} сек`);
    console.log(`📈 Всего токенов: ${totalTokens}`);
    console.log(`💰 В среднем: ${Math.round(totalTokens / successful)} токенов на пост`);

    // Save summary
    const summary = {
      generated_at: new Date().toISOString(),
      total: count,
      successful,
      failed: count - successful,
      total_tokens: totalTokens,
      avg_tokens_per_post: Math.round(totalTokens / successful),
      duration_seconds: (endTime - startTime) / 1000
    };

    const summaryPath = path.join(__dirname, '../data/generation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📁 Отчёт сохранён в generation-summary.json`);

    // Check DB stats
    const stats = db.getStats();
    console.log(`\n📊 СТАТИСТИКА БД:`);
    console.log(`   Всего постов: ${stats.posts}`);
    console.log(`   Логов: ${stats.generationLogs}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

function selectRandomRubric() {
  const rubrics = db.getRubrics({ channel: 'b2c', active: true });
  return rubrics[Math.floor(Math.random() * rubrics.length)];
}

function selectTopic(rubric) {
  const rubricTopics = topics[rubric.id];
  if (!rubricTopics || !rubricTopics.topics) {
    return `Пост про ${rubric.name}`;
  }
  return rubricTopics.topics[Math.floor(Math.random() * rubricTopics.topics.length)];
}

function selectRandomProduct() {
  const allProducts = db.readCollection('products');
  if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) return null;
  return allProducts[Math.floor(Math.random() * allProducts.length)];
}

async function generateSinglePost(rubric, topic, product) {
  const systemPrompt = buildSystemPrompt(rubric, product);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Напиши пост для Telegram канала @podonki по следующей теме: "${topic}"\n\nТребования:\n- Объём: 150-300 слов\n- Тон: молодёжный, ироничный, естественный\n- Используй эмодзи (макс 3-5)\n- Никаких корпоративных слов`
      }
    ]
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const tokens = message.usage.input_tokens + message.usage.output_tokens;

  // Save to DB
  const post = db.addPost({
    channel: 'b2c',
    rubric: rubric.name,
    product_id: product?.id || null,
    status: 'draft',
    scheduled_date: new Date().toISOString(),
    text: text,
    media_urls: [],
    model_used: 'claude-opus-4-6',
    generation_tokens: tokens
  });

  db.logGeneration({
    channel: 'b2c',
    rubric: rubric.name,
    product_query: product?.name || 'auto',
    model: 'claude-opus-4-6',
    tokens_used: tokens,
    success: true,
    generated_text: text.substring(0, 500),
    quality_score: 8.5
  });

  return {
    text,
    tokens,
    postId: post.id
  };
}

function buildSystemPrompt(rubric, product) {
  return `Ты профессиональный копирайтер для Telegram канала вейп-бренда Podonki.

РУБРИКА: ${rubric.name}
ОПИСАНИЕ: ${rubric.description}

ИНСТРУКЦИИ:
1. Пиши как живой человек (офигеть, зашел, норм, хрен)
2. НЕ используй: инновационный, уникальный, революционный
3. Эмодзи макс 5
4. Короткие предложения (максимум 15 слов)
5. Вопрос в конец для вовлечения
6. Честность: допускаются минусы если есть`;
}

generateBatch();
