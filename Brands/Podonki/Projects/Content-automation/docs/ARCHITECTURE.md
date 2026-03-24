# Архитектура Podonki Automation

## Общая схема

```
┌─────────────────────────────────────────────────────────────┐
│                    PODONKI AUTOMATION SYSTEM                │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐    ┌────────────────────────────────┐
│  TELEGRAM CHANNELS   │    │      TRAINING DATASETS         │
├──────────────────────┤    ├────────────────────────────────┤
│ • train_lab (B2B)    │    │ • own-b2b-*.jsonl              │
│ • podonki_off (B2B)  │    │ • own-b2c-*.jsonl              │
│ • podonki (B2C)      │───▶│ • chat-*.jsonl                 │
│ • chat (Podonki)     │    │ • competitor-*.jsonl           │
│ • lolzteam (comp)    │    │ • style-analysis.json          │
│ • habr_news (comp)   │    │ • parse-summary.json           │
│ • eksployt (comp)    │    │                                │
└──────────────────────┘    └────────────────────────────────┘
         ▲                              ▲
         │                              │
         │                       (JSON Lines format)
         │
    TELEGRAM API
    (GramJS Library)
         │
         ▼
┌──────────────────────┐
│   PARSER             │
│ parse-telegram.js    │
├──────────────────────┤
│ • parseChannel()     │
│ • extractMetadata()  │
│ • cleanText()        │
│ • saveData()         │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│   GENERATOR          │    │      AI MODELS                 │
│ post-generator.js    │    ├────────────────────────────────┤
├──────────────────────┤    │ • Claude 4.6 (генерация)       │
│ • loadTrainingData() │───▶│ • Ollama qwen2.5 (локально)   │
│ • analyzeStyle()     │    │ • OpenRouter (бесплатно)       │
│ • getExamples()      │    │                                │
│ • createPrompt()     │    │                                │
│ • saveAnalysis()     │    │                                │
└──────────────────────┘    └────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│              AI POST GENERATION                               │
│ (System Prompt + Few-shot Examples + Topic)                  │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│              AUTOMATION SCHEDULER (n8n)                       │
│ • Daily parsing at 08:00                                     │
│ • Content generation at 10:00                                │
│ • Publishing at 12:00, 18:00, 22:00                          │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│   TELEGRAM BOT       │
│ (TBD)                │
├──────────────────────┤
│ • /publish           │
│ • /analytics         │
│ • /draft             │
│ • /schedule          │
└──────────────────────┘
```

## Компоненты

### 1. Parser (`scripts/parse-telegram.js`)

**Функция:** Парсит все каналы и сохраняет в датасеты

**Входные параметры:**
- Telegram API ID + Hash
- Список каналов (B2B, B2C, конкуренты)
- Лимит сообщений (0 = все)

**Выходные данные:**
- JSON файлы с полным историей
- JSONL файлы для обучения (построчно)
- JSON сводка

**Расписание:** Ежедневно 08:00 через n8n

### 2. Generator (`src/generators/post-generator.js`)

**Функция:** Анализирует датасеты и готовит промпты для AI

**Методы:**
```javascript
analyzeStyle(category)        // Анализирует стиль постов
getExamples(category, count)  // Получает примеры
createSystemPrompt(category)  // Готовит промпт для Claude
saveAnalysis(path)            // Сохраняет анализ
```

**Входные данные:**
- JSONL датасеты из парсера
- Метаданные (длина, структура, стиль)

**Выходные данные:**
- System prompt для Claude
- Few-shot examples
- Style analysis JSON

### 3. Training Data Structure

```json
{
  "text": "очищенный текст поста",
  "originalText": "оригинальный текст",
  "metadata": {
    "hasHeadline": true,
    "hasList": false,
    "hasLink": true,
    "hasBold": true,
    "length": 450,
    "paragraphs": 3
  },
  "date": "2026-03-11T08:00:01.000Z",
  "type": "b2b"
}
```

### 4. Style Analysis Output

```json
{
  "b2b": {
    "sampleCount": 45,
    "averageLength": 520,
    "headlinePercentage": 78,
    "listPercentage": 45,
    "boldPercentage": 89,
    "emojiPercentage": 65,
    "topWords": [
      {"word": "поста", "count": 12},
      {"word": "инструмент", "count": 9}
    ]
  }
}
```

## Data Flow

### Парсинг → Обучение → Генерация

```
1. ПАРСИНГ (08:00 daily)
   └─ Telegram API
      └─ GramJS Client
         └─ parseChannel() for each channel
            ├─ Extract all messages
            ├─ Clean text
            ├─ Extract metadata
            └─ Save to JSON/JSONL

2. АНАЛИЗ (10:00)
   └─ Load all JSONL files
      └─ PostGenerator.analyzeStyle()
         ├─ Average length
         ├─ Structure patterns
         ├─ Top words
         └─ Save analysis.json

3. ГЕНЕРАЦИЯ (11:00)
   └─ PostGenerator.createSystemPrompt()
      ├─ Include style info
      ├─ Add few-shot examples
      ├─ Set audience
      └─ Send to Claude API
         └─ Generate post

4. ПУБЛИКАЦИЯ (12:00, 18:00, 22:00)
   └─ TelegramClient.sendMessage()
      ├─ Publish to channel
      ├─ Log to database
      └─ Notify admin
```

## Интеграция с n8n

### Workflow 1: Daily Parsing

```
Trigger (08:00)
  ↓
Run: node scripts/parse-telegram.js
  ↓
Move files: data/raw/ → data/datasets/
  ↓
Save summary to database
  ↓
Notify admin in Telegram
```

### Workflow 2: Content Generation

```
Trigger (10:00, with new data)
  ↓
Load: data/processed/style-analysis.json
  ↓
For each category (B2B, B2C):
  └─ Run PostGenerator.createSystemPrompt()
     └─ Send to Claude API
        └─ Save draft to data/drafts/
     └─ Notify in Telegram chat
```

### Workflow 3: Auto-Publishing

```
Trigger (12:00, 18:00, 22:00)
  ↓
Check: data/drafts/ for approved posts
  ↓
For each approved post:
  └─ TelegramClient.sendMessage()
     └─ Send to corresponding channel
     └─ Log publish metadata
     └─ Create analytics record
```

## База данных структура

```
posts/
├── id (UUID)
├── channel (train_lab, podonki_off, podonki)
├── type (generated, manual, competitor)
├── content (text)
├── metadata {
│   ├── length
│   ├── style_category (b2b/b2c)
│   ├── generated_at
│   ├── published_at
│   ├── likes
│   ├── comments
│   ├── shares
│   └── views
├── status (draft, approved, published, archived)
└── created_at

analytics/
├── channel
├── date
├── posts_count
├── total_views
├── total_likes
├── avg_engagement_rate
└── top_performing_post
```

## API Endpoints (для Telegram Bot)

```
POST /api/generate
  ├─ category (b2b/b2c)
  ├─ topic (text)
  └─ count (1-5)
  → Returns: [{id, content, metadata}]

POST /api/publish
  ├─ post_id
  ├─ channel
  └─ schedule_at (optional)
  → Returns: {status, channel, timestamp}

GET /api/analytics
  ├─ channel
  ├─ date_from
  └─ date_to
  → Returns: {posts, engagement, trends}

GET /api/drafts
  → Returns: [{id, content, status, channel}]

POST /api/approve
  ├─ post_id
  └─ schedule_time
  → Returns: {status, scheduled_at}
```

## Масштабирование

### Фаза 1 (Текущая)
- [x] Парсер всех каналов
- [x] Датасеты для обучения
- [x] Style analyzer
- [ ] Claude integration

### Фаза 2
- [ ] n8n workflows для автоматизации
- [ ] Telegram Bot для управления
- [ ] Базовая аналитика

### Фаза 3
- [ ] Fine-tuned модель на датасетах
- [ ] Продвинутая аналитика
- [ ] A/B тестирование постов
- [ ] Рекомендации по контенту

### Фаза 4
- [ ] Полная автоматизация (от идеи до публикации)
- [ ] Мониторинг трендов конкурентов
- [ ] Auto-response в чате
- [ ] Integration с analytics сервисами
