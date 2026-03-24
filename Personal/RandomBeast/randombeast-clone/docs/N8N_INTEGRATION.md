# n8n Integration Guide

Автоматизация Random Beast с помощью n8n (localhost:5678)

## Workflows

### 1. Auto-Create Giveaway from Telegram Message

Когда кто-то напишет в бот `/create_giveaway`, автоматически создается розыгрыш.

**Nodes:**
1. **Telegram Trigger** - слушаем сообщения
2. **HTTP Request** - парсим сообщение через Claude API
3. **HTTP Request** - создаем розыгрыш в Random Beast API

```json
{
  "nodes": [
    {
      "parameters": {
        "token": "{{ env.TELEGRAM_BOT_TOKEN }}",
        "waitForWebhook": true
      },
      "name": "Telegram Trigger",
      "type": "n8n-nodes-telegram.telegram",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "{{ env.CLAUDE_API_URL }}/api/giveaway/create",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer {{ env.ADMIN_TOKEN }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "title",
              "value": "{{ $node['Telegram Trigger'].json.message.text }}"
            },
            {
              "name": "creator_id",
              "value": "{{ $node['Telegram Trigger'].json.message.from.id }}"
            }
          ]
        }
      },
      "name": "Create Giveaway",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 300]
    }
  ]
}
```

### 2. Weekly Auto-End Giveaway

Каждый день в 20:00 завершает старые розыгрыши и выбирает победителя.

**Nodes:**
1. **Cron** - запускается по расписанию
2. **HTTP Request** - получаем гiveaways старше суток
3. **Loop** - для каждого розыгрыша
4. **HTTP Request** - завершаем розыгрыш
5. **Telegram Send** - уведомляем победителя

### 3. Auto-Notify Winner

Когда розыгрыш закончен, автоматически отправляем уведомление победителю.

**Nodes:**
1. **Webhook** (на POST /api/giveaway/:id/end)
2. **HTTP Request** - получаем данные победителя
3. **Telegram Send** - отправляем сообщение с поздравлением

```javascript
// Webhook URL:
https://localhost:3001/webhook/giveaway-ended

// Payload:
{
  "giveaway_id": "abc123",
  "winner_id": "user123",
  "title": "iPhone 15"
}
```

## Setup Instructions

### 1. Установи Telegram credentials в n8n

1. Открой http://localhost:5678
2. Перейди в Credentials
3. Создай новый **Telegram Bot** credential:
   - Token: твой Bot Token от @BotFather
   - Save

### 2. Создай первый Workflow

1. New Workflow
2. Add Node → Telegram Trigger
3. Select credential
4. Set webhook (n8n сам подскажет URL)
5. Add HTTP Request node
6. Configure POST request to Random Beast API

### 3. Тестирование

```bash
# Отправь тестовое сообщение боту
curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<YOUR_ID>","text":"/create_giveaway iPhone 15"}'
```

## API Endpoints для n8n

Используй эти endpoints в n8n HTTP Request nodes:

```
POST /api/giveaway/create
POST /api/giveaway/:id/end
POST /api/giveaway/:id/join
GET /api/user/:userId/giveaways
POST /api/admin/giveaways/:id (delete)
```

Пример HTTP Node config:

```json
{
  "method": "POST",
  "url": "http://localhost:3001/api/giveaway/create",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{ env.ADMIN_TOKEN }}"
  },
  "body": {
    "title": "{{ input }}",
    "creator_id": "{{ telegram_user_id }}",
    "prize_description": "Awesome prize",
    "subscription_required": false
  }
}
```

## Environment Variables in n8n

1. Перейди Settings → Environment Variables
2. Добавь:
   ```
   TELEGRAM_BOT_TOKEN=xxx...
   ADMIN_TOKEN=super_secret_token
   CLAUDE_API_URL=http://localhost:3001
   ```

## Примеры Workflows

Готовые workflows в папке `./n8n-workflows/`:
- `auto-create-giveaway.json`
- `daily-giveaway-end.json`
- `notify-winner.json`

Импортируй через n8n UI: New Workflow → Import from file

## Troubleshooting

**Telegram не отправляет webhook?**
- Проверь что Webhook URL доступен из интернета
- Используй ngrok для локального тестирования: `ngrok http 3001`

**HTTP Request returns 401?**
- Проверь ADMIN_TOKEN в env
- Убедись что header правильно назван

**n8n workflow не запускается?**
- Проверь что schedule (Cron) правильно сконфигурирован
- Посмотри логи в n8n UI
