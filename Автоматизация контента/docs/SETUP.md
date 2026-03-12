# Поднятие проекта Podonki

## 1. Инициализация

```bash
cd "C:\Users\Пох кто\OneDrive\Рабочий стол\Podonki"
npm install
cp config/.env.example config/.env
```

## 2. Конфигурация

Отредактируй `config/.env`:

```env
TELEGRAM_API_ID=10497335
TELEGRAM_API_HASH=09fb2fc7c61c928cf5515006516ec6aa
CLAUDE_API_KEY=sk-ant-your-key  # Получить из https://console.anthropic.com
```

## 3. Парсинг данных

```bash
# Парсить все каналы (B2B, B2C, конкуренты, чаты)
npm run parse

# Результаты сохранятся в:
# - data/raw/              (сырые данные)
# - data/datasets/         (структурированные датасеты JSONL)
# - data/processed/        (обработанные данные)
```

## 4. Анализ стиля постов

```bash
# Проанализирует датасеты и выведет стиль
npm run generate

# Создаст файл: data/processed/style-analysis.json
```

## 5. Использование генератора постов

```javascript
const PostGenerator = require('./src/generators/post-generator.js');

const generator = new PostGenerator();

// Получить промпт для Claude/Ollama
const systemPrompt = generator.createSystemPrompt('b2b');
console.log(systemPrompt);

// Получить примеры постов
const examples = generator.getExamples('b2c', 5);
console.log(examples);

// Получить анализ стиля
const style = generator.analyzeStyle('b2b');
console.log(style);
```

## 6. Интеграция с Claude API

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const PostGenerator = require('./src/generators/post-generator.js');

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const generator = new PostGenerator();

async function generatePost(topic, category = 'b2b') {
  const systemPrompt = generator.createSystemPrompt(category);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Напиши пост на тему: ${topic}`,
      },
    ],
  });

  return response.content[0].text;
}

// Использование
(async () => {
  const post = await generatePost('Новые инструменты для автоматизации', 'b2b');
  console.log(post);
})();
```

## 7. Структура датасетов

После парсинга получишь:

```
data/
├── datasets/
│   ├── training/
│   │   ├── own-b2b-train_lab-full.json       (все посты)
│   │   ├── own-b2b-train_lab-training.jsonl  (для обучения)
│   │   ├── own-b2c-podonki-full.json
│   │   ├── own-b2c-podonki-training.jsonl
│   │   ├── chat-podonki-full.json
│   │   ├── chat-podonki-dialogs.jsonl
│   │   ├── competitor-lolzteam-full.json
│   │   └── ...
│   └── parse-summary.json                    (сводка)
├── raw/
│   └── telegram.session                      (сессия авторизации)
└── processed/
    └── style-analysis.json                   (анализ стиля)
```

## 8. Следующие шаги

- [ ] Настроить интеграцию с Claude API для генерации
- [ ] Создать scheduler для автоматического постинга (через n8n)
- [ ] Добавить Telegram Bot для управления каналами
- [ ] Создать Dashboard для аналитики
- [ ] Настроить мониторинг конкурентов (ежедневный парсинг)

## Помощь

**Вопрос:** Где хранится сессия Telegram?
**Ответ:** `data/raw/telegram.session` — она сохраняется при первом запуске парсера

**Вопрос:** Как часто парсить данные?
**Ответ:** Рекомендуется 1 раз в день через n8n или cron

**Вопрос:** Можно ли использовать локальные модели (Ollama)?
**Ответ:** Да! Используй `OLLAMA_BASE_URL` и `OLLAMA_MODEL` в .env
