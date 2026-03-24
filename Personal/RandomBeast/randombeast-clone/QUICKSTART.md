# Random Beast Clone - Quick Start

## Получить код за 5 минут

### 1. Скачай и установи

```bash
cd randombeast-clone
npm install
```

### 2. Создай бота в Telegram

1. Напиши @BotFather в Telegram
2. Команда `/newbot`
3. Назови бота (например, "RandomBeastClone")
4. Получишь **Bot Token** (длинная строка)

### 3. Запусти приложение

```bash
# Создай .env файл (вручную, т.к. хук блокирует)
# Содержимое:
PORT=3001
NODE_ENV=development
TELEGRAM_BOT_TOKEN=<вставь токен отсюда>
ADMIN_TOKEN=super_secret_admin_token_123

# Запусти
npm run dev
```

Приложение будет на **http://localhost:3001**

### 4. Запусти в Telegram

**Вариант 1: Локально (только для тестирования)**
```bash
# Используй tma.dev для локального тестирования
https://tma.dev/start?startapp=BOTUSERNAME
```

**Вариант 2: На сервере (production)**
1. Развертни приложение (Heroku, Railway, VPS)
2. В @BotFather команда `/setappshortname`
3. Выбери бота и установи Web App URL

## Основные операции

### Создать розыгрыш

```bash
curl -X POST http://localhost:3001/api/giveaway/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "iPhone 15 Pro",
    "description": "Win latest iPhone!",
    "creator_id": "user_123",
    "prize_description": "iPhone 15 Pro Max 256GB",
    "subscription_required": false,
    "max_participants": 1000
  }'
```

### Получить активные розыгрыши

```bash
curl http://localhost:3001/api/giveaway/active
```

### Присоединиться к розыгрышу

```bash
curl -X POST http://localhost:3001/api/giveaway/GIVEAWAY_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "subscribed": true
  }'
```

### Завершить розыгрыш (выбрать победителя)

```bash
curl -X POST http://localhost:3001/api/giveaway/GIVEAWAY_ID/end
```

## Структура проекта

```
randombeast-clone/
├── server.js              # Точка входа
├── package.json           # Зависимости
├── .env.example           # Пример конфига (заполни сам)
├── Dockerfile             # Docker образ
├── docker-compose.yml     # Docker Compose
│
├── public/                # Фронтенд
│   ├── index.html         # Основная страница
│   └── js/app.js          # Логика приложения
│
├── src/
│   ├── db.js              # База данных (SQLite)
│   ├── routes/            # API маршруты
│   │   ├── telegram.js    # Telegram интеграция
│   │   ├── giveaway.js    # Розыгрыши
│   │   ├── user.js        # Пользователи
│   │   └── admin.js       # Админ панель
│   └── utils/             # Утилиты
│       ├── telegram-verification.js
│       └── telegram-bot-api.js
│
└── docs/
    └── N8N_INTEGRATION.md # Автоматизация через n8n
```

## Что дальше

- [ ] Запусти локально и проверь API через Postman
- [ ] Интегрируй с n8n для автоматизации (см. `docs/N8N_INTEGRATION.md`)
- [ ] Развертни на сервер (Docker рекомендуется)
- [ ] Добавь проверку подписки на Telegram канал
- [ ] Напиши тесты
- [ ] Деплой на production

## Полезные ссылки

- 📚 [README.md](./README.md) - Полная документация
- 🤖 [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- 🔧 [n8n интеграция](./docs/N8N_INTEGRATION.md)
- 📖 [API Reference](./docs/API.md) (TODO)

## Поддержка

Если что-то не работает:
1. Проверь логи: `npm run dev`
2. Убедись что порт 3001 свободен
3. Проверь что Bot Token правильный
4. Посмотри на GitHub issues

Готово! 🚀
