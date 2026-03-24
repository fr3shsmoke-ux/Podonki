# GitHub + n8n интеграция для Podonki

**Описание:** Когда GitHub Actions завершит парсинг конкурентов или генерацию идей, n8n автоматически обработает результаты: отправит в Telegram, сохранит в Google Sheets, обновит Qdrant.

---

## 1. GitHub Webhook в n8n

### Шаг 1: Создать Webhook URL в n8n

1. Открыть n8n → New Workflow
2. Добавить **Webhook** node (trigger)
3. Выбрать метод: `POST`
4. Copy URL (что-то вроде: `https://your-n8n.instance/webhook/abc123def456`)

### Шаг 2: Добавить Webhook в GitHub

1. GitHub Репо → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://your-n8n.instance/webhook/abc123def456`
3. **Content type:** `application/json`
4. **Trigger события:**
   - ✅ Push events
   - ✅ Issues
   - ✅ Pull requests
5. **Active:** ✅
6. Add webhook

### Шаг 3: Тестировать webhook

GitHub отправит автоматически test payload. Проверить:
- n8n → Webhook node должен показать received payload
- GitHub → Webhook → Recent Deliveries → Status 200 ✅

---

## 2. Workflow в n8n: GitHub → Telegram

### Простой workflow (3 узла)

```
[1] Webhook (trigger) GitHub push
       ↓
[2] Filter: если path содержит 'data/'
       ↓
[3] Telegram: отправить сообщение о обновлении
```

### Пример конфигурации:

**Узел 1: Webhook**
```
Method: POST
Use N8N Built-in Middleware: ✅
```

**Узел 2: Filter (If)**
```
Condition: json.payload.repository.name == 'podonki-content'
```

**Узел 3: Telegram Node**
```
Bot Token: {{ $env.TELEGRAM_BOT_TOKEN }}
Chat ID: {{ $env.TELEGRAM_CHAT_ID }}
Text:
`📤 GitHub обновлен!

Автор: {{ $json.payload.pusher.name }}
Сообщение: {{ $json.payload.head_commit.message }}
Файлы: {{ $json.payload.head_commit.modified.join(', ') }}

Репо: {{ $json.payload.repository.full_name }}`
```

---

## 3. Advanced Workflow: Парсинг результатов

### Сценарий: Когда завершится парсинг конкурентов

```
[1] Webhook GitHub
    ↓
[2] Filter: если message содержит "Weekly competitors parse"
    ↓
[3] Read file: COMPETITORS-TRACKING.json из GitHub API
    ↓
[4] Code node: обработка JSON
    ↓
[5] Google Sheets: обновить таблицу аналитики
    ↓
[6] Telegram: отправить детальный отчет
```

### Node 3: Читать файл из GitHub API

```yaml
Method: GET
URL: https://api.github.com/repos/YOUR_USERNAME/podonki-content/contents/data/COMPETITORS-TRACKING.json
Headers:
  Authorization: Bearer {{ $env.GITHUB_TOKEN }}
  Accept: application/vnd.github.v3.raw
```

### Node 4: JavaScript обработка

```javascript
const data = JSON.parse(Base64.decode($json.body));
const competitors = data.competitors || [];

// Извлечение статистики
const stats = competitors.map(c => ({
  name: c.name,
  platform: c.platform,
  posts_count: c.recent_posts?.length || 0,
  engagement: c.avg_engagement || 0,
}));

return {
  total_competitors: competitors.length,
  total_posts: competitors.reduce((sum, c) => sum + (c.recent_posts?.length || 0), 0),
  competitors: stats,
  updated_at: new Date().toISOString(),
};
```

### Node 5: Google Sheets

```
Worksheet: Competitors Analysis
Append: new row
Columns:
  Date: {{ $json.updated_at }}
  Total Posts: {{ $json.total_posts }}
  Competitors Tracked: {{ $json.total_competitors }}
  Top Competitor: {{ $json.competitors[0].name }}
```

### Node 6: Telegram отчет

```javascript
const stats = $json.competitors_stats;

const message = `
📊 Weekly Competitors Report

Total competitors tracked: ${stats.total_competitors}
Total posts collected: ${stats.total_posts}

Top performers:
${stats.competitors
  .sort((a, b) => b.posts_count - a.posts_count)
  .slice(0, 3)
  .map((c, i) => `${i + 1}. ${c.name} (${c.posts_count} posts)`)
  .join('\n')}

Last updated: ${stats.updated_at}

#analysis #competitors #automation
`;

return { text: message };
```

---

## 4. Workflow: Генерация идей в Issues

### Когда идеи сгенерированы, создать Issues

```
[1] Webhook: GitHub push на main
    ↓
[2] Filter: если файл = IDEAS-BACKLOG.json
    ↓
[3] HTTP GET: прочитать IDEAS-BACKLOG.json
    ↓
[4] Code: фильтровать новые идеи (не опубликованные)
    ↓
[5] Loop through ideas
    ↓
    [5a] GitHub API: создать Issue для каждой идеи
    ↓
    [5b] Telegram: notify что created issues
```

### Node 3: HTTP GET

```
URL: https://raw.githubusercontent.com/YOUR_USERNAME/podonki-content/main/data/IDEAS-BACKLOG.json
Headers:
  Authorization: Bearer {{ $env.GITHUB_TOKEN }}
```

### Node 4: Фильтрация новых идей

```javascript
const ideas = JSON.parse($json.body);
const newIdeas = ideas.filter(idea => !idea.posted);

return newIdeas.slice(0, 5); // Max 5 issues per run
```

### Node 5a: GitHub API - Create Issue

```yaml
Method: POST
URL: https://api.github.com/repos/YOUR_USERNAME/podonki-content/issues
Headers:
  Authorization: Bearer {{ $env.GITHUB_TOKEN }}
  Content-Type: application/json
Body:
  {
    "title": "[{{ item.type.toUpperCase() }}] {{ item.title }}",
    "body": "## Idea\n{{ item.description }}\n\n**Platform:** {{ item.platform }}\n**Tags:** {{ item.tags.join(', ') }}\n\n---\n*Auto-created by n8n*",
    "labels": ["content", "{{ item.type }}", "{{ item.platform }}"]
  }
```

### Node 5b: Telegram уведомление

```
Text:
`✨ New idea: {{ item.title }}
Type: {{ item.type }}
Platform: {{ item.platform }}

Created Issue: [Link]`
```

---

## 5. Workflow: Обновление Qdrant для RAG

Когда добавлены новые идеи, добавить их в Qdrant для RAG.

```
[1] Webhook GitHub (IDEAS-BACKLOG.json updated)
    ↓
[2] HTTP: Get IDEAS-BACKLOG.json
    ↓
[3] Code: Подготовить embeddings
    ↓
[4] HTTP POST: Отправить в Qdrant
    ↓
[5] Telegram: confirm
```

### Node 3: Подготовка текста для embeddings

```javascript
const ideas = JSON.parse($json.body);

return ideas.filter(idea => !idea.posted).map(idea => ({
  id: idea.id,
  title: idea.title,
  description: idea.description,
  type: idea.type,
  platform: idea.platform,
  tags: idea.tags,
  text: `${idea.title}\n${idea.description}\n${idea.tags.join(', ')}`,
}));
```

### Node 4: Отправить в Qdrant

```
Method: POST
URL: http://localhost:6333/collections/podonki-ideas/points?wait=true
Headers:
  Content-Type: application/json
Body:
  {
    "points": [
      {
        "id": "{{ item.id }}",
        "vector": {{ embeddings_from_previous_node }},
        "payload": {
          "title": "{{ item.title }}",
          "description": "{{ item.description }}",
          "type": "{{ item.type }}",
          "platform": "{{ item.platform }}"
        }
      }
    ]
  }
```

---

## 6. Workflow: GitHub Actions Status Notifications

Когда GitHub Actions workflow fails, получить уведомление.

```
[1] Webhook: GitHub Actions workflow result
    ↓
[2] Filter: если conclusion == 'failure'
    ↓
[3] Telegram: Alert о ошибке с деталями
```

**GitHub:** Settings → Webhooks → `workflow_run` событие

**Node 1: Webhook**
```
Trigger on: workflow_run
```

**Node 2: Filter**
```
$json.payload.workflow_run.conclusion == 'failure'
```

**Node 3: Telegram Alert**
```
Text:
`🚨 GitHub Actions Failed!

Workflow: {{ $json.payload.workflow_run.name }}
Commit: {{ $json.payload.workflow_run.head_commit.message }}
Author: {{ $json.payload.workflow_run.head_commit.author.name }}

Logs: {{ $json.payload.workflow_run.html_url }}`
```

---

## 7. Окружение переменные в n8n

**Добавить в n8n окружение:**

1. n8n → Settings → Environment variables

```
GITHUB_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_TOKEN = 123456:ABCD-EFGHIJKLMNOP
TELEGRAM_CHAT_ID = -1001234567890
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxx
QDRANT_API_KEY = xxxxxxxxxxxxxxxx
```

2. Использование в workflows:
```
{{ $env.GITHUB_TOKEN }}
{{ $env.TELEGRAM_BOT_TOKEN }}
```

---

## 8. Шпаргалка: Webhook Payloads

### Push Event Payload

```json
{
  "ref": "refs/heads/main",
  "before": "commit_sha_before",
  "after": "commit_sha_after",
  "repository": {
    "name": "podonki-content",
    "full_name": "username/podonki-content"
  },
  "pusher": {
    "name": "author_name"
  },
  "commits": [
    {
      "id": "commit_sha",
      "message": "Weekly competitors parse: 2026-03-13",
      "timestamp": "2026-03-13T13:00:00Z",
      "added": ["data/COMPETITORS-TRACKING.json"],
      "modified": [],
      "removed": []
    }
  ]
}
```

### Issues Event Payload

```json
{
  "action": "opened",
  "issue": {
    "id": 123456,
    "number": 42,
    "title": "[TikTok] Best vape unboxing ideas",
    "body": "Description...",
    "user": {
      "login": "username"
    }
  },
  "repository": {
    "name": "podonki-content"
  }
}
```

---

## 9. Готовые templates n8n

Скопировать в `.github/workflows/` для быстрого экспорта:

**Export n8n workflow as JSON:**
1. n8n → Workflow → Menu → Download
2. Сохранить как `n8n-workflow-github-integration.json`
3. Commit в репо `docs/n8n/`

**Импорт в другой инстанс n8n:**
1. n8n → Import
2. Выбрать файл JSON
3. Обновить Environment variables
4. Activate

---

## 10. Архитектура (полная цепь)

```
GitHub (push events)
    ↓
GitHub Webhooks
    ↓
n8n (webhook trigger)
    ↓
Process data
    │
    ├→ Telegram (notifications)
    ├→ Google Sheets (analytics)
    ├→ Qdrant (embeddings storage)
    ├→ GitHub Issues (task tracking)
    └→ Email (reports)
```

**Время обработки:** 2-5 сек от push до уведомления

**Стоимость:** Бесплатно (используются free tiers)

---

## 11. Troubleshooting

### Webhook не trigger'ит

✅ Проверить:
1. GitHub Settings → Webhooks → Recent Deliveries → Status
2. n8n → Webhook node → URL корректный
3. GitHub → Webhook → Secret (если используется)

### n8n получает payload но неправильно парсит

✅ Решение:
```javascript
// Вместо прямого использования $json
const payload = typeof $json === 'string' ? JSON.parse($json) : $json;
```

### Google Sheets не обновляется

✅ Проверить:
1. n8n → Google Sheets node → Credentials правильные
2. Sheet существует и не в режиме просмотра
3. Columns соответствуют headers

### Qdrant не сохраняет данные

✅ Проверить:
1. Qdrant running: `curl http://localhost:6333/health`
2. Collection создана
3. Embeddings vector правильного размера (1536 для Claude)

---

## Финал

**Что получилось:**
- ✅ GitHub Actions запускают скрипты по расписанию
- ✅ n8n обрабатывает результаты в реальном времени
- ✅ Telegram получает уведомления автоматически
- ✅ Google Sheets собирает аналитику
- ✅ Qdrant хранит embeddings для RAG

**Нет ручной работы, всё автоматизировано! 🎉**

---

**Версия:** 1.0
**Для:** Podonki automation
**Последнее обновление:** 2026-03-13
