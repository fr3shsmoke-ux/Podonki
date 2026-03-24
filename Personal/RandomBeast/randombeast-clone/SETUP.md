# Setup Guide - Random Beast Clone

## Что создано

✅ **Полный Telegram Mini App клон @randombeast** с функциональностью розыгрышей

### Backend
- Node.js + Express сервер
- SQLite база данных
- Верификация Telegram Web App data
- 4 типа API маршрутов (Telegram, Giveaway, User, Admin)
- Поддержка Docker & Docker Compose

### Frontend
- Vanilla JavaScript (без фреймворков)
- Responsive дизайн для мобильных
- Интеграция с Telegram Web App API
- 3 вкладки (Active, My Participations, My Giveaways)
- Модальное окно для создания розыгрышей

### Документация
- README.md - полная документация
- QUICKSTART.md - быстрый старт за 5 минут
- N8N_INTEGRATION.md - автоматизация через n8n
- .env.example - переменные конфигурации

## Как запустить

### Шаг 1: Получи Bot Token

```
1. Откой Telegram и найди @BotFather
2. Напиши /newbot
3. Следуй инструкциям
4. Получишь Bot Token (длинная строка типа "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")
```

### Шаг 2: Создай .env файл

```bash
# В папке randombeast-clone создай файл .env (не .env.example!)
# Содержимое:

PORT=3001
NODE_ENV=development
TELEGRAM_BOT_TOKEN=<ВСТАВЬ ТВОЙ BOT TOKEN СЮДА>
ADMIN_TOKEN=super_secret_admin_token_xyz123
```

### Шаг 3: Установи зависимости

```bash
cd randombeast-clone
npm install
```

### Шаг 4: Запусти приложение

```bash
npm run dev
```

Приложение запустится на **http://localhost:3001**

## Тестирование

### Через Postman / curl

```bash
# 1. Создать розыгрыш
curl -X POST http://localhost:3001/api/giveaway/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Giveaway",
    "description": "Test description",
    "creator_id": "user123",
    "prize_description": "Test prize",
    "subscription_required": false
  }'

# 2. Получить активные розыгрыши
curl http://localhost:3001/api/giveaway/active

# 3. Присоединиться к розыгрышу
curl -X POST http://localhost:3001/api/giveaway/<GIVEAWAY_ID>/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "subscribed": true
  }'

# 4. Завершить розыгрыш (выбрать победителя)
curl -X POST http://localhost:3001/api/giveaway/<GIVEAWAY_ID>/end
```

### В Telegram

1. Откой ссылку вида:
   ```
   https://t.me/<ТВОЙ_БОТ>/app
   ```

2. Или используй tma.dev для локального тестирования:
   ```
   https://tma.dev/start
   ```

## Интеграция с n8n

Полный гайд в `docs/N8N_INTEGRATION.md`

Быстрая интеграция:
1. Откой n8n (localhost:5678)
2. Создай новый Workflow
3. Add Node → Telegram
4. Add Node → HTTP Request
5. POST на http://localhost:3001/api/giveaway/create

## Деплой

### Docker (локально)

```bash
docker-compose up
```

### На сервер (VPS / Railway / Heroku)

```bash
# 1. Скопируй все файлы на сервер
scp -r randombeast-clone user@server:/app/

# 2. Подключись через SSH
ssh user@server

# 3. Установи зависимости
cd /app/randombeast-clone
npm install

# 4. Создай .env с Bot Token
nano .env

# 5. Запусти приложение (рекомендуется PM2)
npm i -g pm2
pm2 start server.js --name randombeast
pm2 startup
pm2 save
```

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|---------|
| POST | /api/telegram/init | Инициализация пользователя |
| GET | /api/telegram/user/:id | Профиль пользователя |
| POST | /api/giveaway/create | Создать розыгрыш |
| GET | /api/giveaway/active | Активные розыгрыши |
| GET | /api/giveaway/:id | Детали розыгрыша |
| POST | /api/giveaway/:id/join | Присоединиться |
| POST | /api/giveaway/:id/end | Завершить и выбрать победителя |
| GET | /api/user/:id/giveaways | Розыгрыши пользователя |
| GET | /api/user/:id/participations | Участия пользователя |
| GET | /api/admin/stats | Статистика (требует ADMIN_TOKEN) |

## Структура БД

### Таблица: users
- id (TEXT, PRIMARY KEY)
- telegram_id (INTEGER, UNIQUE)
- username (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- avatar_url (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### Таблица: giveaways
- id (TEXT, PRIMARY KEY)
- title (TEXT)
- description (TEXT)
- creator_id (TEXT, FK)
- status (TEXT: 'active' / 'ended')
- image_url (TEXT)
- prize_description (TEXT)
- subscription_required (BOOLEAN)
- channel_id (TEXT)
- max_participants (INTEGER)
- created_at (DATETIME)
- ended_at (DATETIME)
- winner_id (TEXT, FK)

### Таблица: participants
- id (TEXT, PRIMARY KEY)
- giveaway_id (TEXT, FK)
- user_id (TEXT, FK)
- subscribed (BOOLEAN)
- participated_at (DATETIME)

### Таблица: notifications
- id (TEXT, PRIMARY KEY)
- user_id (TEXT, FK)
- giveaway_id (TEXT, FK)
- type (TEXT)
- message (TEXT)
- read (BOOLEAN)
- created_at (DATETIME)

## Возможные ошибки и решения

**Port 3001 already in use**
```bash
# Убей процесс на порте
lsof -ti :3001 | xargs kill -9
# Или используй другой порт
PORT=3002 npm run dev
```

**Bot Token invalid**
```
Проверь что скопировал правильно без пробелов
```

**CORS errors**
```
Убедись что приложение доступно с Telegram Web App
Используй HTTPS на production
```

## TODO / Features для расширения

- [ ] Реальная проверка подписки на Telegram канал
- [ ] Система уведомлений (Telegram сообщения)
- [ ] Репосты для увеличения шансов выигрыша
- [ ] Anti-bot механики (капча, rate limiting)
- [ ] Статистика и аналитика
- [ ] Автоматическое завершение розыгрыша по времени
- [ ] Система рейтинга пользователей
- [ ] Темная тема
- [ ] Локализация (RU / EN)

## Поддержка

Все вопросы по n8n, Telegram API, развертыванию:
- 📚 [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- 🤖 [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- 🔧 [n8n Docs](https://docs.n8n.io/)

---

**Готово!** Приложение работает и готово к развертыванию. 🚀
