#!/usr/bin/env node

/**
 * Простой скрипт загрузки товаров в локальный индекс
 * Для использования без Qdrant (fallback режим)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📦 Loading products...\n');

try {
  const productsPath = path.join(__dirname, '../data/products.json');
  const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  console.log(`✅ Loaded ${data.products.length} products:\n`);

  // Группировать по категориям
  const byCategory = {};
  data.products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} товаров`);
  });

  // Статистика по каналам
  console.log('\n📺 By channels:\n');
  const byChannel = {};
  data.products.forEach(p => {
    byChannel[p.channel] = (byChannel[p.channel] || 0) + 1;
  });

  Object.entries(byChannel).forEach(([chan, count]) => {
    console.log(`   ${chan}: ${count} товаров`);
  });

  // Примеры товаров
  console.log('\n🎯 Sample products:\n');
  data.products.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Category: ${p.category}`);
    console.log(`   Channel: ${p.channel}`);
    console.log(`   Flavors: ${p.flavors_count || p.flavor_names?.length || 'N/A'}`);
    console.log('');
  });

  // Создать индекс для быстрого поиска
  const index = {
    total: data.products.length,
    products: data.products,
    categories: Object.keys(byCategory),
    channels: Object.keys(byChannel),
    timestamp: new Date().toISOString()
  };

  const indexPath = path.join(__dirname, '../data/products-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`✅ Index saved to: data/products-index.json`);

  console.log('\n✨ Ready for product search!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
