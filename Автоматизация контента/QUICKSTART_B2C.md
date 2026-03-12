# 🚀 БЫСТРЫЙ СТАРТ — B2C Content Generation

## 1️⃣ Подготовка (5 минут)

### Шаг 1: Получить API ключ Claude
1. Открыть: https://console.anthropic.com/
2. Скопировать API ключ (начинается с `sk-ant-`)
3. Создать `.env` файл в папке `Podonki`:
```bash
cd "C:\Users\Пох кто\OneDrive\Рабочий стол\Podonki"
cp .env.example .env
# Открыть .env в VS Code и вставить ключ после ANTHROPIC_API_KEY=
```

### Шаг 2: Проверить БД
```bash
# Инициализировать (один раз)
node scripts/init-db.js

# Проверить что всё загрузилось
node scripts/get-db-stats.js | grep "B2C"
# Должно вывести: B2C (20)
```

---

## 2️⃣ Генерация (выбери вариант)

### 📝 Вариант A: Один пост (самый быстрый)
```bash
node scripts/generate-post.js
```
✅ Результат: 1 пост в БД (draft статус)

### 📚 Вариант B: Несколько постов
```bash
# 3 поста (по умолчанию)
node scripts/batch-generate.js

# 5 постов
node scripts/batch-generate.js 5

# 10 постов
node scripts/batch-generate.js 10
```
✅ Результат: несколько постов + отчёт в `generation-summary.json`

### 🤖 Вариант C: Автоматизация (n8n)
1. Открыть n8n: http://localhost:5678
2. Workflows → Import
3. Выбрать: `Projects/n8n-workflows/podonki-b2c-generator-v3.json`
4. Добавить переменные:
   - `ANTHROPIC_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_B2C_CHANNEL_ID`
5. Toggle On → Workflow будет генерировать каждые 4 часа

---

## 3️⃣ Проверка результатов

### Посмотреть статистику
```bash
node scripts/get-db-stats.js
```

### Посмотреть последние 5 постов
```bash
node -e "import db from './src/db/podonki-db.js'; console.log(JSON.stringify(db.getCalendar().slice(-5), null, 2))"
```

### Посмотреть конкретный пост
```bash
node -e "import db from './src/db/podonki-db.js'; const posts = db.getCalendar(); console.log(posts[posts.length - 1].text)"
```

---

## 📊 Что получаешь

Каждый пост содержит:
- **Текст**: 150-300 слов, молодёжный тон
- **Рубрика**: одна из 20 (Вкусовой тестер, Челленж, Гивэвей и т.д.)
- **Товар**: случайная линейка из 18 доступных
- **Статус**: draft (готовый к редактированию)
- **Логирование**: сохранён в logs, можешь анализировать

Примеры:
```
✅ Первая затяжка... вкус как в детстве. Потом холод. Потом хочется ещё.
✅ Челленж: угадай вкус с закрытыми глазами. Я промахнулся 😅
✅ Сравниваю 3 ягодных вкуса Podgon — один явно лучше. Угадаешь какой?
```

---

## 🐛 Если что-то не работает

### ❌ "API key not found"
```bash
# Проверить что .env создан и содержит ключ
cat .env | grep ANTHROPIC_API_KEY

# Если пусто — добавить ключ вручную:
echo "ANTHROPIC_API_KEY=sk-ant-YOUR_KEY" > .env
```

### ❌ "Рубрики не загружены"
```bash
# Переинициализировать:
node scripts/init-db.js
```

### ❌ "Товары не найдены"
```bash
# Проверить что products.json существует:
ls -la data/products.json

# Если нет — создать пустой:
echo "[]" > data/products.json
```

---

## 📈 Метрики генерации

После каждой генерации смотри:
- `data/generation-summary.json` — общая статистика
- `data/generation-logs.json` — детальные логи
- `data/content-calendar.json` — все посты

Примеры метрик:
```json
{
  "total": 10,
  "successful": 10,
  "avg_tokens_per_post": 845,
  "duration_seconds": 12.5
}
```

---

## 🎯 Следующие шаги

1. **Тестирование**: `node scripts/batch-generate.js 3`
2. **Проверка качества**: `node scripts/get-db-stats.js`
3. **Экспорт**: `node -e "import db from './src/db/podonki-db.js'; console.log(db.exportCalendarToCSV())"`
4. **Публикация в Telegram**: настроить n8n workflow
5. **Регулярная генерация**: активировать автоматизацию

---

## 📚 Полная документация

Смотри: `B2C_GENERATION_SYSTEM.md`

**Версия**: 1.0
**Дата**: 11.03.2026
**Статус**: ✅ Готово к использованию
