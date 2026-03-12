# B2C Content Generation System — Полная инструкция

**Дата**: 11.03.2026
**Статус**: 🚀 Готово к использованию

---

## 📋 Структура системы

### 1. **Рубрики (20 штук)**
Все рубрики загружены в `data/rubrics.json`:
- Основные (частые): Вкусовой тестер, Лайфстайл, Челленж, Новинка, Образование, Мемы (60%)
- Дополнительные (средние): UGC, Сравнения, Гивэвей, Истории, Мифбастинг (30%)
- Редкие: За кулисами, Коллабы, Вопросы, Опросы, Вейпинг-техника, Наука, Интервью, Регуляция (10%)

**Веса нормализованы**: 99.6% ≈ 100%

### 2. **Темы (по 10 на рубрику)**
Все темы в `data/b2c-rubric-topics.json`:
- По рубрике: 10 вариантов тем для генерации
- Примеры: "Тестирую Last Hap Манго", "Челленж: угадай вкус с закрытыми глазами"
- Автоматический выбор при генерации (случайный)

### 3. **Товары (18 линеек)**
Загружены из `data/products.json`:
- Жидкости (9 линеек): Last Hap, Podgon, Hotspot, Light, Sour, Isterika, Critical, Malasian, Malasian Arcade
- Табак (4 линейки): Mini, Original, Click, Swedish
- Снюс (1): Podonki Slick
- Никпаки (3): Critical, x Mad, Original
- Конструктор (1): Podgonki

---

## 🚀 Как использовать

### Вариант 1: Генерация одного поста

```bash
cd "C:\Users\Пох кто\OneDrive\Рабочий стол\Podonki"

# Случайная рубрика, случайная тема, случайный товар
node scripts/generate-post.js

# С указанием рубрики
node scripts/generate-post.js b2c b2c_flavor_test

# С указанием рубрики и темы
node scripts/generate-post.js b2c b2c_memes "Когда товарищ скажет 'ты парик?' и ты говоришь да"
```

**Результат**: Пост сохранится в `data/content-calendar.json` как `draft`

### Вариант 2: Пакетная генерация (3-10 постов)

```bash
# Генерирует 3 поста (по умолчанию)
node scripts/batch-generate.js

# Генерирует 10 постов
node scripts/batch-generate.js 10

# Генерирует 1 пост
node scripts/batch-generate.js 1
```

**Результат**:
- Все посты сохранены в БД
- Отчёт в `data/generation-summary.json`
- Статистика генерации в `data/generation-logs.json`

### Вариант 3: n8n Автоматизация

1. Откроешь n8n (localhost:5678)
2. Workflows → Import
3. Выбираешь `Projects/n8n-workflows/podonki-b2c-generator-v3.json`
4. Настраиваешь переменные окружения (если нужны)
5. Active workflow → Toggle on
6. **Результат**: каждые 4 часа генерирует пост, публикует в Telegram

---

## 📊 Проверка результатов

```bash
# Посмотреть статистику
node scripts/get-db-stats.js

# Посмотреть свежие посты
node -e "import db from './src/db/podonki-db.js'; console.log(JSON.stringify(db.getCalendar().slice(-3), null, 2))"

# Посмотреть логи генерации
node -e "import db from './src/db/podonki-db.js'; const logs = db.readCollection('generationLogs'); console.log(logs.slice(-5));"
```

---

## 🔧 Настройка

### Изменить расписание n8n
В `podonki-b2c-generator-v3.json` строка 7-12:
```json
"interval": [
  {
    "unit": "hours",  // или "minutes", "days"
    "value": 4        // каждые 4 часа
  }
]
```

### Добавить новую рубрику
1. Добавить в `scripts/init-db.js` (объект рубрики)
2. Добавить в `data/b2c-rubric-topics.json` (10 тем)
3. Пересчитать веса так чтобы сумма = 1.0

### Изменить веса рубрик
В `podonki-b2c-generator-v3.json` функция `Select Rubric` —
отредактировать массив `rubrics` и поле `weight`

---

## 💡 Примеры использования

### Пример 1: Быстрая генерация для проверки

```bash
# Генерирует 3 поста разных рубрик
node scripts/batch-generate.js 3

# Проверяешь результат
node scripts/get-db-stats.js
```

### Пример 2: Ежедневная публикация

1. Настроить n8n на генерацию каждые 24 часа
2. Нужны переменные окружения:
   - `ANTHROPIC_API_KEY` (Claude API)
   - `TELEGRAM_BOT_TOKEN` (бот Telegram)
   - `TELEGRAM_B2C_CHANNEL_ID` (ID канала @podonki)
3. Активировать workflow

### Пример 3: Контролируемая генерация (вручную)

```bash
# Генерирую пост про "Вкусовой тестер"
node scripts/generate-post.js b2c b2c_flavor_test

# Генерирую пост про "Гивэвей"
node scripts/generate-post.js b2c b2c_giveaway "Гивэвей: выиграй набор на 5000 рублей"

# Проверяю БД
node scripts/get-db-stats.js
```

---

## 📁 Файлы проекта

```
Podonki/
├── scripts/
│   ├── init-db.js                  # Инициализация (19 рубрик)
│   ├── get-db-stats.js             # Просмотр статистики
│   ├── generate-post.js            # Генерация одного поста ✨
│   ├── batch-generate.js           # Генерация нескольких ✨
│   └── test-generate-v2.js         # Тест
├── src/db/
│   └── podonki-db.js               # ORM для JSON
├── data/
│   ├── rubrics.json                # 20 B2C рубрик (обновлено)
│   ├── products.json               # 18 линеек товаров
│   ├── content-calendar.json       # Все посты
│   ├── generation-logs.json        # Логи генерации
│   ├── b2c-rubric-topics.json      # 200 тем (обновлено) ✨
│   └── generation-summary.json     # Отчёт последней генерации
└── Projects/n8n-workflows/
    └── podonki-b2c-generator-v3.json    # n8n workflow (новый) ✨
```

---

## ✅ Чек-лист перед запуском

- [ ] Claude API ключ в переменной `ANTHROPIC_API_KEY`
- [ ] Товары загружены: `node -e "import db from './src/db/podonki-db.js'; console.log(db.readCollection('products').length)"`
- [ ] Рубрики загружены: `node scripts/get-db-stats.js | grep "B2C"` (должно быть 20)
- [ ] Темы существуют: `ls -la data/b2c-rubric-topics.json`
- [ ] БД инициализирована: `node scripts/init-db.js`

---

## 🐛 Troubleshooting

**Ошибка: "Cannot find module '@anthropic-ai/sdk'"**
```bash
npm install @anthropic-ai/sdk
```

**Ошибка: "API key not found"**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Ошибка: "Рубрика не найдена"**
→ Запустить `node scripts/init-db.js` чтобы переинициализировать

**Ошибка: "Нет тем для рубрики"**
→ Проверить что `data/b2c-rubric-topics.json` существует

---

## 📈 Метрики

После генерации смотри в `data/generation-summary.json`:
```json
{
  "total": 10,
  "successful": 10,
  "failed": 0,
  "total_tokens": 8450,
  "avg_tokens_per_post": 845,
  "duration_seconds": 12.5
}
```

---

## 🎯 Следующие шаги

1. **Тестирование**: `node scripts/batch-generate.js 3`
2. **Проверка качества**: просмотреть посты в БД
3. **n8n интеграция**: импортировать `podonki-b2c-generator-v3.json`
4. **Настройка Telegram**: указать токен и ID канала
5. **Запуск**: активировать workflow

---

**Версия**: 1.0 (финальная)
**Дата последнего обновления**: 11.03.2026
**Статус**: ✅ Продакшн-готовая версия
