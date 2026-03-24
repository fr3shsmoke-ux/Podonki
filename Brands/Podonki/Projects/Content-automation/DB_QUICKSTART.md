# Podonki Database — Быстрый старт

База данных готова! Используется JSON для хранения данных о постах, рубриках, аналитике и логах.

---

## 📁 Структура файлов

```
data/
├── products.json              # 18 линеек товаров
├── content-calendar.json      # Посты (черновики, расписанные, опубликованные)
├── generation-logs.json       # История попыток генерации
├── rubrics.json               # 19 рубрик по 3 каналам
├── analytics.json             # Метрики публикаций (engagement, views, etc)
└── system-prompts.json        # System prompts для каждой рубрики
```

---

## 🚀 Команды для работы

### 1. Инициализация БД (уже сделано)
```bash
node scripts/init-db.js
```
Создаёт коллекции, загружает 19 рубрик, добавляет тестовый пост.

### 2. Просмотр статистики
```bash
node scripts/get-db-stats.js
```
Показывает:
- Количество постов по статусам (draft, scheduled, published)
- Генерацию статистику (успешные/неудачные, токены)
- Аналитику (engagement, топ-рубрики)
- Расписанные посты на неделю

### 3. Генерация и сохранение поста (прямой вызов)
```javascript
import db from './src/db/podonki-db.js';

// Добавить новый пост
const post = db.addPost({
  channel: 'train_lab',
  rubric: 'Товар месяца / Новинка',
  product_id: 'liquid_last_hap',
  status: 'draft',
  scheduled_date: new Date().toISOString(),
  text: 'Generated text here...',
  media_urls: [],
  model_used: 'claude',
  generation_tokens: 1250
});

console.log('Post created:', post.id);
```

### 4. Получить календарь постов
```javascript
const calendar = db.getCalendar({
  channel: 'train_lab',
  status: 'scheduled'
});
```

### 5. Логирование генерации
```javascript
db.logGeneration({
  channel: 'train_lab',
  rubric: 'Товар месяца / Новинка',
  product_query: 'Last Hap',
  model: 'claude',
  tokens_used: 1250,
  success: true,
  generated_text: 'First 500 chars of generated post...',
  quality_score: 8.5
});
```

### 6. Обновить статус поста
```javascript
db.updatePostStatus(postId, 'published', new Date().toISOString());
```

### 7. Экспортировать календарь в CSV (для Excel)
```javascript
const csvPath = db.exportCalendarToCSV();
console.log('Exported to:', csvPath);
```

---

## 📊 Примеры запросов

### Получить все активные рубрики Train Lab
```javascript
import db from './src/db/podonki-db.js';
const rubrics = db.getRubrics({
  channel: 'train_lab',
  active: true
});
console.log(rubrics);
```

### Получить статистику генерации за неделю
```javascript
const stats = db.getGenerationStats({
  from_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
});
console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);
```

### Получить топ-продукты по аналитике
```javascript
const summary = db.getAnalyticsSummary();
summary.topProducts.forEach(p => {
  console.log(`${p.product}: ${p.count} posts`);
});
```

---

## 🔄 Интеграция с n8n

Воркфлоу `podonki-content-automation-v2.json` делает следующее:

1. **Schedule Trigger** — запускается ежедневно (можно менять)
2. **Select Rubric** — выбирает рубрику по весам (случайно но с учётом процентов)
3. **Generate Post** — вызывает Claude API для генерации
4. **Check Success** — проверяет успех
5. **Send to Telegram** — публикует в Telegram канал (если успешно)
6. **Update Post Status** — меняет статус на "published"
7. **Log Success/Error** — логирует результат
8. **Save to DB** — сохраняет в БД

**Как импортировать в n8n:**
1. Открыть n8n (localhost:5678)
2. Workflows → Import → выбрать `podonki-content-automation-v2.json`
3. Настроить:
   - Environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_*_CHANNEL_ID)
   - API endpoint для генерации (если не localhost)
4. Активировать workflow

---

## 🔐 Environment переменные

Добавить в `.env`:
```
# Telegram
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_TRAIN_LAB_CHANNEL_ID=-100123456789
TELEGRAM_PODONKI_OFF_CHANNEL_ID=-100987654321
TELEGRAM_B2C_CHANNEL_ID=-100555666777

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# n8n
N8N_API_KEY=your_n8n_key_here
```

---

## 📈 Статистика

После каждого поста в БД записывается:
- **generation_logs**: время, канал, рубрика, модель, токены, успешность
- **content_calendar**: пост добавляется как "published"
- **analytics**: если есть engagement (views, likes, comments)

Команда `node scripts/get-db-stats.js` показывает:
```
📈 OVERALL STATISTICS
   Total posts: 42
   Rubrics: 19
   Products: 18
   Generation logs: 42

📊 ANALYTICS SUMMARY
   Published posts: 38
   Total engagement: 1,240
   Average engagement: 32.6
```

---

## 🛠️ Расширение

Можешь добавить:

1. **Telegram Analytics** — скрапить реальные метрики из Telegram после публикации
2. **Ручное редактирование** — простой веб-интерфейс для управления постами
3. **Планирование** — расписать посты вручную на месяц вперёд
4. **A/B тестирование** — логировать какие рубрики работают лучше
5. **Google Sheets интеграция** — синхронизировать с Google Sheets для удобства

---

## ⚡ Быстрая проверка (right now)

```bash
# 1. Проверить статистику
node scripts/get-db-stats.js

# 2. Создать пост вручную и посмотреть в календаре
node -e "import db from './src/db/podonki-db.js'; console.log(db.getCalendar())"

# 3. Экспортировать в CSV
node -e "import db from './src/db/podonki-db.js'; console.log(db.exportCalendarToCSV())"
```

---

**Версия**: 1.0 (финальная)
**Дата**: 16.03.2026
**Статус**: БД готова к использованию в n8n и post-generator
