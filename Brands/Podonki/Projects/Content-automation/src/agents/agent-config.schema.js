// Схема конфигурации агента
export const AGENT_CONFIG_SCHEMA = {
  id: String,              // уникальный ID агента
  name: String,            // "Telegram Parser", "Post Generator"
  description: String,     // что делает
  type: String,            // 'parser' | 'generator' | 'analyzer'
  role: String,            // системный промпт (содержимое или ссылка)
  skills: [String],        // какие файлы/функции использует (саморегестрирующиеся)
  inputs: {                // какие данные нужны
    type: String,          // 'json' | 'csv' | 'text' | 'url'
    description: String,
    required: Boolean,
  },
  outputs: {               // что выдаёт
    type: String,
    description: String,
  },
  parameters: Object,      // настройки агента (model, temperature, max_tokens, etc)
  history: [Object],       // последние запуски (timestamp, status, input_size, output_size)
  createdAt: Date,
  lastUsedAt: Date,
  usageCount: Number,
}

export const AGENT_TYPES = {
  PARSER: 'parser',        // парсит данные (TG, VK, конкуренты)
  GENERATOR: 'generator',  // генерирует контент (посты, тексты)
  ANALYZER: 'analyzer',    // анализирует данные (тренды, метрики)
  OPTIMIZER: 'optimizer',  // оптимизирует (SEO, формат, структура)
}

export const BUILT_IN_AGENTS = {
  'telegram-parser': {
    name: 'Telegram Parser',
    description: 'Парсит посты из Telegram каналов конкурентов',
    type: 'parser',
    skills: ['parse-telegram.js'],
    inputs: { type: 'url', description: 'Telegram channel URL или @username' },
    outputs: { type: 'json', description: 'Массив постов с текстом, media, engagements' },
  },
  'post-generator': {
    name: 'Post Generator',
    description: 'Генерирует посты для Telegram на основе идей и трендов',
    type: 'generator',
    skills: ['post-generator.js', 'bm25-search.js'],
    inputs: { type: 'json', description: 'Идея, стиль, целевая аудитория' },
    outputs: { type: 'text', description: 'Готовый пост с эмодзи, хэштегами' },
  },
  'competitor-analyzer': {
    name: 'Competitor Analyzer',
    description: 'Анализирует конкурентов - их посты, стили, тренды',
    type: 'analyzer',
    skills: ['bm25-search.js', 'podonki-db.js'],
    inputs: { type: 'json', description: 'Список конкурентов или последние посты' },
    outputs: { type: 'json', description: 'Анализ: популярные темы, стили, частота постинга' },
  },
  'seo-optimizer': {
    name: 'SEO Optimizer',
    description: 'Оптимизирует тексты под SEO - ключевые слова, структура, читаемость',
    type: 'optimizer',
    skills: ['post-generator.js'],
    inputs: { type: 'text', description: 'Текст поста для оптимизации' },
    outputs: { type: 'text', description: 'Оптимизированный текст с ключевыми словами' },
  },
  'batch-generator': {
    name: 'Batch Generator',
    description: 'Генерирует 10+ постов за раз на неделю или месяц',
    type: 'generator',
    skills: ['batch-generate.js', 'post-generator.js'],
    inputs: { type: 'json', description: 'Количество постов, стиль, период' },
    outputs: { type: 'json', description: 'Массив готовых постов с датами' },
  },
}
