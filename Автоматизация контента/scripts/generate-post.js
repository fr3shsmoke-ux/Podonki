#!/usr/bin/env node

/**
 * Generate a single B2C post using Claude API
 * Usage: node scripts/generate-post.js [channel] [rubric_id] [topic]
 */

import db from '../src/db/podonki-db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Load topics
const topicsPath = path.join(__dirname, '../data/b2c-rubric-topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));

// Parse arguments
const channel = process.argv[2] || 'b2c';
const rubricId = process.argv[3];
const topic = process.argv[4];

async function generatePost() {
  try {
    console.log('\n🚀 PODONKI POST GENERATOR');
    console.log('═'.repeat(50));

    // Get rubric
    let rubric;
    if (rubricId) {
      rubric = db.getRubric(rubricId);
      if (!rubric) {
        console.log(`❌ Рубрика ${rubricId} не найдена`);
        process.exit(1);
      }
    } else {
      // Random rubric
      const allRubrics = db.getRubrics({ channel, active: true });
      if (allRubrics.length === 0) {
        console.log(`❌ Нет активных рубрик для ${channel}`);
        process.exit(1);
      }
      rubric = allRubrics[Math.floor(Math.random() * allRubrics.length)];
    }

    console.log(`📋 Рубрика: ${rubric.name}`);

    // Get topic
    let selectedTopic;
    const rubricTopics = topics[rubric.id];
    if (!rubricTopics) {
      console.log(`⚠️  Нет тем для рубрики ${rubric.id}`);
      selectedTopic = topic || `Пост про ${rubric.name}`;
    } else if (topic) {
      selectedTopic = topic;
    } else {
      selectedTopic = rubricTopics.topics[Math.floor(Math.random() * rubricTopics.topics.length)];
    }

    console.log(`🎯 Тема: ${selectedTopic}`);

    // Get random product
    const allProducts = db.readCollection('products');
    const product = (allProducts && Array.isArray(allProducts) && allProducts.length > 0)
      ? allProducts[Math.floor(Math.random() * allProducts.length)]
      : null;

    console.log(`📦 Товар: ${product?.name || 'Общий пост'}`);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(rubric, product);

    // Generate with Claude
    console.log('\n⏳ Генерирую пост...');
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Напиши пост для Telegram канала @podonki по следующей теме: "${selectedTopic}"\n\nТребования:\n- Объём: 150-300 слов\n- Тон: молодёжный, ироничный, естественный\n- Используй эмодзи (макс 3-5)\n- Никаких корпоративных слов\n- Только реальные факты о товарах Podonki`
        }
      ]
    });

    const generatedText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Save to DB
    const post = db.addPost({
      channel: channel,
      rubric: rubric.name,
      product_id: product?.id || null,
      status: 'draft',
      scheduled_date: new Date().toISOString(),
      text: generatedText,
      media_urls: [],
      model_used: 'claude-opus-4-6',
      generation_tokens: message.usage.input_tokens + message.usage.output_tokens
    });

    // Log generation
    db.logGeneration({
      channel: channel,
      rubric: rubric.name,
      product_query: product?.name || 'auto',
      model: 'claude-opus-4-6',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      success: true,
      generated_text: generatedText.substring(0, 500),
      quality_score: 8.5
    });

    // Display result
    console.log('\n✅ ПОСТ СОЗДАН');
    console.log('═'.repeat(50));
    console.log(generatedText);
    console.log('\n' + '─'.repeat(50));
    console.log(`📊 Статистика:`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Статус: ${post.status}`);
    console.log(`   Токены: ${message.usage.input_tokens + message.usage.output_tokens}`);
    console.log(`   Сохранён в БД ✅`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

function buildSystemPrompt(rubric, product) {
  return `Ты профессиональный копирайтер для Telegram канала вейп-бренда Podonki.

РУБРИКА: ${rubric.name}
ОПИСАНИЕ: ${rubric.description}

ТОВАРЫ PODONKI:
${getProductInfo(product)}

ИНСТРУКЦИИ:
1. Пиши как живой человек, не корпоративно
2. Используй разговорную речь: офигеть, зашел, норм, хрен
3. НЕ используй: инновационный, уникальный, революционный, в данном контексте
4. Добавляй эмодзи (макс 5)
5. Ссылка на бренд только если естественно
6. Честность: упоминай недостатки если есть
7. Короткие предложения (максимум 15 слов)
8. Вопросы в конец для вовлечения

СТИЛЬ ПРИМЕРЫ:
✅ "Первая затяжка... вкус как в детстве. Потом холод. Потом хочется ещё."
✅ "Челленж: угадай вкус с закрытыми глазами. Я промахнулся 😅"
✅ "Сравниваю 3 вкуса — один явно лучше. Угадаешь какой?"

❌ "Уникальное вкусовое решение с инновационными ароматическими нотками"
❌ "Пожалуйста, оцените качество нашей продукции"`;
}

function getProductInfo(product) {
  if (!product) return '• Любой товар из ассортимента\n• Можно упомянуть несколько';

  return `• Название: ${product.name}
• Категория: ${product.category}
• Линейка: ${product.lineups || 'Основная'}
• Описание: ${product.description || 'N/A'}
• Вкусы: ${product.flavors ? product.flavors.slice(0, 5).join(', ') + '...' : 'разнообразие'}`;
}

generatePost();
