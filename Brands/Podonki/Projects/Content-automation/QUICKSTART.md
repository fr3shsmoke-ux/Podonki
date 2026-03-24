# Podonki — Быстрый старт

## 🚀 За 5 минут

### 1. Инициализация
```bash
cd "C:\Users\Пох кто\OneDrive\Рабочий стол\Podonki"
npm install
```

### 2. Копирование парсера
Парсер уже скопирован в `scripts/parse-telegram.js` ✅

### 3. Запуск парсинга
```bash
npm run parse
```

Введи:
- Номер телефона: +79062526221
- СМС код: [когда придет SMS]
- Пароль 2FA: qq3030439QQ!

### 4. Анализ датасетов
```bash
npm run generate
```

Выведет анализ стиля постов каждого канала

### 5. Готово! 🎉

Датасеты сохранены в `data/datasets/` и готовы для обучения

---

## 📁 Где что находится

| Папка | Назначение |
|-------|-----------|
| `scripts/` | Парсеры и утилиты |
| `src/generators/` | Генератор постов (AI) |
| `data/datasets/` | Датасеты для обучения |
| `data/processed/` | Анализ стиля (style-analysis.json) |
| `config/` | Конфигурация и переменные окружения |
| `docs/` | Документация |

---

## 🎯 Что дальше?

### Генерация постов через Claude
```bash
const PostGenerator = require('./src/generators/post-generator.js');
const generator = new PostGenerator();

// Получить промпт для Claude
const prompt = generator.createSystemPrompt('b2b');
// Отправить в Claude API вместе с requestом на генерацию
```

### Автоматический постинг
Интегрируй с n8n:
1. Запусти парсер (ежедневно)
2. Сгенерируй пост через Claude
3. Опубликуй в канал

### Мониторинг конкурентов
Конкурентов парсит автоматически:
- `data/datasets/competitor-lolzteam-analysis.jsonl`
- `data/datasets/competitor-habr_news-analysis.jsonl`

---

## ⚡ Полезные команды

```bash
npm run parse      # Парсить все каналы
npm run generate   # Анализ стиля
npm run analyze    # Дополнительный анализ
npm run dev        # Разработка (nodemon)
```

---

## 📞 Контакты в коде

API ключи уже в файле:
- Telegram API: `config/.env`
- Claude: добавь после первого парсинга

---

**Готово к работе! Начни с `npm run parse`** 🚀
