#!/usr/bin/env node

/**
 * Генерация контент-плана на неделю на основе рубрик из CONTENT_STRATEGY.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PostGeneratorV2 from '../src/generators/post-generator-v2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Рубрики по каналам (из CONTENT_STRATEGY.md)
const contentPlan = {
  b2b: [
    { rubric: 'Новые товары', weight: 0.20, productQuery: '', example: 'Swedish Collection - премиум технология' },
    { rubric: 'Маржа и условия', weight: 0.25, productQuery: 'все товары', example: '45% от 10k, 75% от 50k' },
    { rubric: 'Тренды рынка', weight: 0.20, productQuery: '', example: 'никель-соли растут, спрос на премиум' },
    { rubric: 'Обучение партнёров', weight: 0.15, productQuery: '', example: 'как работает капсула Click' },
    { rubric: 'Behind the scenes', weight: 0.10, productQuery: '', example: 'как создаём вкусы' },
    { rubric: 'Розыгрыши', weight: 0.10, productQuery: 'последняя новинка', example: 'выиграй Scottish' }
  ],
  b2c: [
    { rubric: 'Обзоры вкусов', weight: 0.25, productQuery: 'фруктовые вкусы', example: 'тестим Last Hap клубника' },
    { rubric: 'Lifestyle', weight: 0.20, productQuery: '', example: 'утро начинается с мяты' },
    { rubric: 'Челленджи', weight: 0.15, productQuery: '', example: 'угадай вкус по описанию' },
    { rubric: 'Новости', weight: 0.15, productQuery: '', example: 'поступила Swedish Collection' },
    { rubric: 'Образование', weight: 0.10, productQuery: '', example: 'чем отличаются nicpacks' },
    { rubric: 'Мемы', weight: 0.10, productQuery: '', example: 'прикол про вкусовые предпочтения' },
    { rubric: 'Интервью', weight: 0.05, productQuery: '', example: 'чат с ценителем минима' }
  ]
};

async function generateWeeklyPlan() {
  console.log('🚀 Weekly Content Plan Generator\n');
  console.log('═'.repeat(60));

  const generator = new PostGeneratorV2();

  const weeklyPosts = {
    b2b: [],
    b2c: [],
    generated_at: new Date().toISOString()
  };

  // Генерировать посты для B2B (Train Lab)
  console.log('\n📺 B2B CHANNEL (Train Lab)\n');

  for (const rubric of contentPlan.b2b) {
    console.log(`📝 ${rubric.rubric} (${Math.round(rubric.weight * 100)}%)`);

    const result = await generator.generatePost(
      'b2b',
      rubric.rubric.toLowerCase().replace(/\s+/g, '_'),
      rubric.productQuery
    );

    const post = {
      rubric: rubric.rubric,
      weight: rubric.weight,
      content: result.post,
      products: result.products || [],
      model: result.model,
      success: result.success
    };

    weeklyPosts.b2b.push(post);

    if (result.success) {
      console.log(`   ✅ Generated`);
      if (result.products?.length > 0) {
        console.log(`   🎯 Products: ${result.products.map(p => p.name).join(', ')}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  }

  // Генерировать посты для B2C (Podonki)
  console.log('\n📱 B2C CHANNEL (Podonki)\n');

  for (const rubric of contentPlan.b2c) {
    console.log(`📝 ${rubric.rubric} (${Math.round(rubric.weight * 100)}%)`);

    const result = await generator.generatePost(
      'b2c',
      rubric.rubric.toLowerCase().replace(/\s+/g, '_'),
      rubric.productQuery
    );

    const post = {
      rubric: rubric.rubric,
      weight: rubric.weight,
      content: result.post,
      products: result.products || [],
      model: result.model,
      success: result.success
    };

    weeklyPosts.b2c.push(post);

    if (result.success) {
      console.log(`   ✅ Generated`);
      if (result.products?.length > 0) {
        console.log(`   🎯 Products: ${result.products.map(p => p.name).join(', ')}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  }

  // Сохранить результаты
  const outputPath = path.join(__dirname, '../data/weekly-plan.json');
  fs.writeFileSync(outputPath, JSON.stringify(weeklyPosts, null, 2));

  console.log('═'.repeat(60));
  console.log(`\n✨ Weekly plan saved to: data/weekly-plan.json`);
  console.log(`\n📊 Summary:`);
  console.log(`   B2B posts: ${weeklyPosts.b2b.length}`);
  console.log(`   B2C posts: ${weeklyPosts.b2c.length}`);
  console.log(`   Total: ${weeklyPosts.b2b.length + weeklyPosts.b2c.length} posts\n`);
}

// Запуск
generateWeeklyPlan().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
