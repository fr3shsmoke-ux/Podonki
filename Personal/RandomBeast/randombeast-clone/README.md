# Random Beast Clone - Telegram Mini App

Полный клон приложения Random Beast (@randombeast) - платформа для розыгрышей в Telegram.

## Функционал

✅ Создание розыгрышей (giveaway) с:
- Изображениями
- Описанием приза
- Проверкой подписки на канал
- Максимальным числом участников

✅ Участие в розыгрышах
- Просмотр активных розыгрышей
- Присоединение к розыгрышам
- Отслеживание своих участий
- История выигрышей

✅ Управление розыгрышами
- Просмотр своих розыгрышей
- Статистика участников
- Выбор победителя (случайный)

✅ Админ панель
- Статистика платформы
- Модерация розыгрышей
- Управление пользователями

## Установка

```bash
cd randombeast-clone
npm install
```

## Конфигурация

1. Скопируй `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. Заполни переменные:
```
TELEGRAM_BOT_TOKEN=<Bot Token от @BotFather>
ADMIN_TOKEN=<Твой секретный админ токен>
```

## Запуск

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3001`

## Архитектура

### Backend (Node.js + Express)
- `server.js` - точка входа
- `src/db.js` - инициализация БД (SQLite)
- `src/routes/` - все API маршруты:
  - `telegram.js` - инит и верификация Telegram
  - `giveaway.js` - создание, вступление, управление розыгрышами
  - `user.js` - профиль, история, уведомления
  - `admin.js` - админ функции

### Frontend (Vanilla JS + Telegram Web App)
- `public/index.html` - основная разметка
- `public/js/app.js` - логика приложения
- Стили встроены в HTML

## API Endpoints

### Telegram
- `POST /api/telegram/init` - инициализация с verifyData
- `GET /api/telegram/user/:telegramId` - профиль пользователя

### Giveaways
- `POST /api/giveaway/create` - создать розыгрыш
- `GET /api/giveaway/active` - активные розыгрыши
- `GET /api/giveaway/:id` - детали розыгрыша
- `POST /api/giveaway/:id/join` - присоединиться
- `POST /api/giveaway/:id/end` - завершить и выбрать победителя

### User
- `GET /api/user/:userId/giveaways` - розыгрыши пользователя
- `GET /api/user/:userId/participations` - участия пользователя
- `GET /api/user/:userId/notifications` - уведомления

### Admin
- `GET /api/admin/stats` - статистика (требует ADMIN_TOKEN)
- `GET /api/admin/giveaways` - все розыгрыши
- `DELETE /api/admin/giveaways/:id` - удалить розыгрыш
- `POST /api/admin/users/:userId/ban` - забанить пользователя

## Развертывание в Telegram

1. Создай бота через @BotFather
2. Получи Bot Token
3. Развертни приложение (например, на Heroku, Railway, или свой сервер)
4. В @BotFather установи Web App URL (например, `https://yourdomain.com`)
5. Добавь в бота кнопку для открытия mini app

## Примеры использования

### Создание розыгрыша
```javascript
POST /api/giveaway/create
{
  "title": "iPhone 15 Pro",
  "description": "Win latest iPhone!",
  "creator_id": "user_id",
  "prize_description": "iPhone 15 Pro Max 256GB",
  "image_url": "https://...",
  "subscription_required": true,
  "channel_id": "-1001234567890",
  "max_participants": 1000
}
```

### Присоединение к розыгрышу
```javascript
POST /api/giveaway/abc123/join
{
  "userId": "user_id",
  "subscribed": true
}
```

### Завершение розыгрыша
```javascript
POST /api/giveaway/abc123/end
// Возвращает winner_id (случайно выбранный из участников)
```

## Безопасность

- ✅ Верификация Telegram Web App data (HMAC-SHA256)
- ✅ Admin токен для защиты админ функций
- ✅ SQL инъекции предотвращены (parameterized queries)
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: Проверка подписки на Telegram канал через Bot API

## TODO

- [ ] Реальная проверка подписки на канал
- [ ] Система уведомлений (когда выиграл)
- [ ] Репосты для увеличения шансов
- [ ] Anti-bot механики
- [ ] Тестирование
- [ ] Деплой конфигурация (Docker, PM2)

## Лицензия

MIT
