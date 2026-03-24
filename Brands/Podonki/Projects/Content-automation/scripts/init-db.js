#!/usr/bin/env node

/**
 * Initialize Podonki Database
 * Creates collections and populates with initial data
 */

import db from '../src/db/podonki-db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🗄️  INITIALIZING PODONKI DATABASE\n');

// 1. Load products from existing catalog
console.log('📦 Loading products...');
const productsPath = path.join(__dirname, '../data/products.json');
if (fs.existsSync(productsPath)) {
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  // Products are already loaded, just verify
  console.log(`   ✅ ${productsData.products?.length || 0} products loaded`);
} else {
  console.log('   ⚠️  products.json not found, skipping');
}

// 2. Initialize rubrics from SYSTEM_PROMPTS_FINAL.md
console.log('\n📋 Creating rubrics...');

const rubrics = [
  // Train Lab rubrics
  {
    id: 'train_lab_product_announcement',
    channel: 'train_lab',
    name: 'Товар месяца / Новинка',
    weight: 0.20,
    description: 'Представить товар как решение для магазина',
    system_prompt_key: 'train_lab_product_announcement',
    examples: [
      {
        text: 'Last Hap: 50мг, 40 вкусов',
        product: 'Last Hap'
      }
    ],
    active: true
  },
  {
    id: 'train_lab_comparison',
    channel: 'train_lab',
    name: 'Сравнение товаров',
    weight: 0.20,
    description: 'Помочь партнёру выбрать товар под задачу',
    system_prompt_key: 'train_lab_comparison',
    examples: [
      {
        text: 'Podgon vs Last Hap: выбирайте по клиенту',
        product: 'Podgon'
      }
    ],
    active: true
  },
  {
    id: 'train_lab_retail_solution',
    channel: 'train_lab',
    name: 'Решение ретейл-проблемы',
    weight: 0.25,
    description: 'Помочь решить проблемы магазина через товар',
    system_prompt_key: 'train_lab_retail_solution',
    examples: [],
    active: true
  },
  {
    id: 'train_lab_characteristics',
    channel: 'train_lab',
    name: 'Знай свой товар',
    weight: 0.15,
    description: 'Образование партнёра о характеристиках',
    system_prompt_key: 'train_lab_characteristics',
    examples: [],
    active: true
  },
  {
    id: 'train_lab_brand',
    channel: 'train_lab',
    name: 'Бренд Podonki',
    weight: 0.10,
    description: 'Укрепить доверие и показать поддержку',
    system_prompt_key: 'train_lab_brand',
    examples: [],
    active: true
  },
  {
    id: 'train_lab_legality',
    channel: 'train_lab',
    name: 'Легальность и документы',
    weight: 0.10,
    description: 'Показать прозрачность (редко)',
    system_prompt_key: 'train_lab_legality',
    examples: [],
    active: true
  },

  // Podonki Off rubrics
  {
    id: 'podonki_off_premium',
    channel: 'podonki_off',
    name: 'Товар месяца / Премиум',
    weight: 0.20,
    description: 'Позиционировать табак/конструктор как премиум',
    system_prompt_key: 'podonki_off_premium',
    examples: [],
    active: true
  },
  {
    id: 'podonki_off_category',
    channel: 'podonki_off',
    name: 'Табак vs Жидкость',
    weight: 0.15,
    description: 'Выбор категории для магазина',
    system_prompt_key: 'podonki_off_category',
    examples: [],
    active: true
  },
  {
    id: 'podonki_off_retail_solution',
    channel: 'podonki_off',
    name: 'Решение ретейл-проблемы',
    weight: 0.20,
    description: 'Помочь решить конкретные проблемы',
    system_prompt_key: 'podonki_off_retail_solution',
    examples: [],
    active: true
  },
  {
    id: 'podonki_off_constructor',
    channel: 'podonki_off',
    name: 'Конструктор как модель',
    weight: 0.15,
    description: 'Показать конструктор как источник дохода',
    system_prompt_key: 'podonki_off_constructor',
    examples: [],
    active: true
  },
  {
    id: 'podonki_off_legality',
    channel: 'podonki_off',
    name: 'Легальность табака',
    weight: 0.15,
    description: 'Усилить позицию "мы легальные"',
    system_prompt_key: 'podonki_off_legality',
    examples: [],
    active: true
  },
  {
    id: 'podonki_off_brand',
    channel: 'podonki_off',
    name: 'Бренд и премиум',
    weight: 0.15,
    description: 'Укрепить позицию премиум-бренда',
    system_prompt_key: 'podonki_off_brand',
    examples: [],
    active: true
  },

  // B2C rubrics
  {
    id: 'b2c_flavor_test',
    channel: 'b2c',
    name: 'Вкусовой тестер',
    weight: 0.20,
    description: 'Развлечь и информировать про вкус',
    system_prompt_key: 'b2c_flavor_test',
    examples: [],
    active: true
  },
  {
    id: 'b2c_lifestyle',
    channel: 'b2c',
    name: 'Лайфстайл / Момент дня',
    weight: 0.20,
    description: 'Вейп как часть образа жизни',
    system_prompt_key: 'b2c_lifestyle',
    examples: [],
    active: true
  },
  {
    id: 'b2c_challenge',
    channel: 'b2c',
    name: 'Челленж / Игра',
    weight: 0.15,
    description: 'Вовлечение через игру и конкурс',
    system_prompt_key: 'b2c_challenge',
    examples: [],
    active: true
  },
  {
    id: 'b2c_announcement',
    channel: 'b2c',
    name: 'Новинка / Анонс',
    weight: 0.15,
    description: 'Интрига и информирование',
    system_prompt_key: 'b2c_announcement',
    examples: [],
    active: true
  },
  {
    id: 'b2c_education',
    channel: 'b2c',
    name: 'Образование',
    weight: 0.10,
    description: 'Образовать молодёжь (весело)',
    system_prompt_key: 'b2c_education',
    examples: [],
    active: true
  },
  {
    id: 'b2c_memes',
    channel: 'b2c',
    name: 'Мемы / Тренды',
    weight: 0.10,
    description: 'Быть частью молодёжной культуры',
    system_prompt_key: 'b2c_memes',
    examples: [],
    active: true
  },
  {
    id: 'b2c_interview',
    channel: 'b2c',
    name: 'Интервью / История',
    weight: 0.05,
    description: 'Голос сообщества и истории',
    system_prompt_key: 'b2c_interview',
    examples: [],
    active: true
  },
  {
    id: 'b2c_ugc',
    channel: 'b2c',
    name: 'UGC: Юзер-контент',
    weight: 0.06,
    description: 'Юзергенерированный контент, рецензии',
    system_prompt_key: 'b2c_ugc',
    examples: [],
    active: true
  },
  {
    id: 'b2c_comparison',
    channel: 'b2c',
    name: 'Вейп vs конкуренты',
    weight: 0.06,
    description: 'Сравнение с альтернативами',
    system_prompt_key: 'b2c_comparison',
    examples: [],
    active: true
  },
  {
    id: 'b2c_giveaway',
    channel: 'b2c',
    name: 'Раздачи / Гивэвей',
    weight: 0.07,
    description: 'Конкурсы и раздачи товаров',
    system_prompt_key: 'b2c_giveaway',
    examples: [],
    active: true
  },
  {
    id: 'b2c_story',
    channel: 'b2c',
    name: 'Истории в деталях',
    weight: 0.06,
    description: 'Глубокие истории людей, мотивация',
    system_prompt_key: 'b2c_story',
    examples: [],
    active: true
  },
  {
    id: 'b2c_myth_bust',
    channel: 'b2c',
    name: 'Мифбастинг / Факты vs Мифы',
    weight: 0.06,
    description: 'Развенчание мифов о вейпе и никотине',
    system_prompt_key: 'b2c_myth_bust',
    examples: [],
    active: true
  },
  {
    id: 'b2c_behind_scenes',
    channel: 'b2c',
    name: 'За кулисами / Как создаётся',
    weight: 0.05,
    description: 'Закадровые видео, процесс разработки',
    system_prompt_key: 'b2c_behind_scenes',
    examples: [],
    active: true
  },
  {
    id: 'b2c_collaboration',
    channel: 'b2c',
    name: 'Сотрудничество / Кроссоверы',
    weight: 0.05,
    description: 'Совместные проекты с блогерами/брендами',
    system_prompt_key: 'b2c_collaboration',
    examples: [],
    active: true
  },
  {
    id: 'b2c_product_deep_dive',
    channel: 'b2c',
    name: 'Глубокий разбор товара',
    weight: 0.06,
    description: 'Полный разбор характеристик и преимуществ',
    system_prompt_key: 'b2c_product_deep_dive',
    examples: [],
    active: true
  },
  {
    id: 'b2c_community_asks',
    channel: 'b2c',
    name: 'Вопросы сообщества',
    weight: 0.05,
    description: 'Ответы на вопросы от подписчиков',
    system_prompt_key: 'b2c_community_asks',
    examples: [],
    active: true
  },
  {
    id: 'b2c_polls',
    channel: 'b2c',
    name: 'Опросы / Голосование',
    weight: 0.05,
    description: 'Интерактивные опросы на вкусы и выбор',
    system_prompt_key: 'b2c_polls',
    examples: [],
    active: true
  },
  {
    id: 'b2c_vaping_tech',
    channel: 'b2c',
    name: 'Техника вейпинга / Как выбрать',
    weight: 0.06,
    description: 'Образовательный контент о вейпе-девайсах',
    system_prompt_key: 'b2c_vaping_tech',
    examples: [],
    active: true
  },
  {
    id: 'b2c_health_science',
    channel: 'b2c',
    name: 'Наука / Здоровье / Факты',
    weight: 0.05,
    description: 'Научные факты о вейпировании и никотине',
    system_prompt_key: 'b2c_health_science',
    examples: [],
    active: true
  },
  {
    id: 'b2c_regulations',
    channel: 'b2c',
    name: 'Регуляция / Законность',
    weight: 0.03,
    description: 'Информация о законах и регуляции',
    system_prompt_key: 'b2c_regulations',
    examples: [],
    active: true
  }
];

let rubricsAdded = 0;
rubrics.forEach(rubric => {
  // Check if exists
  const existing = db.getRubrics({ channel: rubric.channel }).find(r => r.id === rubric.id);
  if (!existing) {
    db.addRubric(rubric);
    rubricsAdded++;
  }
});
console.log(`   ✅ ${rubricsAdded} new rubrics added (${db.getRubrics().length} total)`);

// 3. Load system prompts (from SYSTEM_PROMPTS_FINAL.md content)
console.log('\n🤖 Loading system prompts...');

const systemPromptsPath = path.join(__dirname, '../SYSTEM_PROMPTS_FINAL.md');
if (fs.existsSync(systemPromptsPath)) {
  console.log('   ✅ System prompts file found (will be integrated separately)');
} else {
  console.log('   ⚠️  SYSTEM_PROMPTS_FINAL.md not found');
}

// 4. Display stats
console.log('\n📊 DATABASE STATISTICS\n');
const stats = db.getStats();
console.log(`   Posts in calendar: ${stats.posts}`);
console.log(`   Generation logs: ${stats.generationLogs}`);
console.log(`   Analytics records: ${stats.analyticsRecords}`);
console.log(`   Rubrics: ${stats.rubrics}`);
console.log(`   Products: ${stats.products}`);

console.log('\n   Post Status Distribution:');
console.log(`     Draft: ${stats.postsByStatus.draft}`);
console.log(`     Scheduled: ${stats.postsByStatus.scheduled}`);
console.log(`     Published: ${stats.postsByStatus.published}`);
console.log(`     Archived: ${stats.postsByStatus.archived}`);

// 5. Create sample post (for testing)
console.log('\n🧪 Creating sample post for testing...');
const samplePost = db.addPost({
  channel: 'train_lab',
  rubric: 'Товар месяца / Новинка',
  product_id: 'liquid_last_hap',
  status: 'draft',
  scheduled_date: new Date().toISOString(),
  text: '[Sample post text will be generated]',
  media_urls: [],
  model_used: 'claude',
  generation_tokens: 0
});
console.log(`   ✅ Sample post created: ${samplePost.id}`);

console.log('\n✨ DATABASE INITIALIZATION COMPLETE\n');
console.log('📂 Data directory:', path.join(__dirname, '../data'));
console.log('\n💡 Next steps:');
console.log('   1. Run: node scripts/test-generate-v2.js (to test generation)');
console.log('   2. Run: node scripts/get-db-stats.js (to view statistics)');
console.log('   3. Check: data/content-calendar.json (to see all posts)\n');
