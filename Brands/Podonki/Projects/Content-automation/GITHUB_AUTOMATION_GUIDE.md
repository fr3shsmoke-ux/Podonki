# GitHub для контент-автоматизации Podonki

**Дата создания:** март 2026
**Версия:** 1.0
**Для:** Цепочка автоматизации контента Podonki (генерация → постинг → аналитика)

---

## TL;DR: Что GitHub может дать Podonki

| Задача | GitHub решение | Статус |
|--------|----------------|--------|
| Еженедельный парсинг конкурентов | GitHub Actions + Cron | ✅ Быстро |
| Автозапуск скриптов (Python) | Actions по расписанию | ✅ Готово |
| Публикация в Telegram на расписание | Actions + Telegram Bot | ✅ Есть действия |
| Безопасное хранение API ключей | Secrets (шифруется) | ✅ Встроено |
| Интеграция с n8n через webhooks | GitHub Webhooks → n8n | ✅ Есть API |
| Хранение скриптов и конфигов | Gists (приватные) | ✅ Бесплатно |
| Отслеживание задач контента | Issues + Projects | ✅ Встроено |
| Генерация контента по триггерам | Actions + API | ✅ Настраивается |

---

## 1. GitHub Actions для Podonki

### 1.1 Что это?

GitHub Actions — это встроенная система автоматизации GitHub. Она запускает скрипты по триггерам (push, расписание, вручную) в облаке.

**Плюсы:**
- Бесплатно для публичных репо (2000 мин/месяц на приватные)
- Запускается в облаке (не нужен свой сервер)
- Встроены секреты для API ключей
- Интегрируется с любыми API

**Минусы:**
- Макс. 6 часов на один запуск
- Макс. 5 минут между Cron запусками
- Нужен .yaml файл в `.github/workflows/`

### 1.2 Сценарий 1: Еженедельный парсинг конкурентов

**Что делает:** Каждый понедельник в 10:00 запускается Python скрипт, парсит 9 конкурентов, сохраняет данные в репо.

**Файл:** `.github/workflows/weekly-scrape-competitors.yml`

```yaml
name: Weekly Competitors Scraping
on:
  schedule:
    # Понедельник 10:00 UTC (13:00 МСК)
    - cron: '0 10 * * 1'
  workflow_dispatch:  # Кнопка для ручного запуска

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run competitors scraper
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          POLZA_API_KEY: ${{ secrets.POLZA_API_KEY }}
        run: python scripts/parse-all-platforms.py

      - name: Commit results
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add -A
          git commit -m "Auto-update: competitors data $(date +%Y-%m-%d)"
          git push
```

**Когда пригодится:**
- Еженедельный парсинг TikTok, Instagram, Telegram конкурентов (Грех, Злая монашка и т.д.)
- Сохранение результатов в `data/competitors-tracking.json`
- Уведомление в Telegram, что парсинг завершен

---

### 1.3 Сценарий 2: Генерация контента по расписанию

**Что делает:** Каждый день в 23:00 генерирует 5 идей для постов через Claude API.

**Файл:** `.github/workflows/daily-content-generation.yml`

```yaml
name: Daily Content Generation
on:
  schedule:
    # Каждый день 23:00 UTC (02:00 МСК следующего дня)
    - cron: '0 23 * * *'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate content
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          CLAUDE_MODEL: claude-3-5-sonnet-20241022
        run: node scripts/idea-generator.js

      - name: Save to IDEAS-BACKLOG
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add data/IDEAS-BACKLOG.json
          git commit -m "Daily ideas: $(date +%Y-%m-%d)" || echo "No changes"
          git push || echo "Nothing to push"
```

**Что добавить:**
- Уведомление в Telegram о новых идеях
- Сохранение в Qdrant (RAG)
- Тегирование по категориям

---

### 1.4 Сценарий 3: Постинг в Telegram на расписание

**Что делает:** Берет лучший пост из IDEAS-BACKLOG и публикует в Telegram канал.

**Файл:** `.github/workflows/telegram-scheduled-post.yml`

```yaml
name: Telegram Scheduled Post
on:
  schedule:
    # Пн, Ср, Пт в 18:00 UTC (21:00 МСК)
    - cron: '0 18 * * 1,3,5'
  workflow_dispatch:

jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Telegram client
        run: pip install python-telegram-bot requests

      - name: Post to Telegram
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: python scripts/telegram-poster.py

      - name: Notify on success
        run: |
          echo "✅ Post published to Telegram"
```

**Нужно создать `scripts/telegram-poster.py`:**

```python
import os
import json
from telegram import Bot
import asyncio

async def post_to_telegram():
    bot = Bot(token=os.getenv('TELEGRAM_BOT_TOKEN'))
    chat_id = os.getenv('TELEGRAM_CHAT_ID')

    # Читаем лучший пост из IDEAS-BACKLOG
    with open('data/IDEAS-BACKLOG.json') as f:
        ideas = json.load(f)

    best_idea = ideas[0]  # Или логика выбора лучшего

    message = f"""
🔥 {best_idea['title']}

{best_idea['description']}

#{', #'.join(best_idea['tags'])}
    """

    await bot.send_message(chat_id=chat_id, text=message)
    print(f"✅ Posted: {best_idea['title']}")

asyncio.run(post_to_telegram())
```

---

### 1.5 Сценарий 4: Интеграция с n8n через Webhooks

**Что делает:** Когда в репо пушится обновление контента, GitHub отправляет вебхук в n8n для дальнейшей обработки.

**Шаг 1: Создать webhook на Гитхабе**
1. Репо → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-n8n.instance/webhook/github-content-update`
3. Content type: `application/json`
4. Trigger: `push`, `pull_request`
5. Secret: генерируем в n8n и сохраняем

**Шаг 2: n8n workflow**
```
GitHub Webhook → Trigger
    ↓
Filter: если path содержит "data/"
    ↓
Parse JSON
    ↓
Send to Claude для обработки
    ↓
Update Google Sheets (аналитика)
    ↓
Notify in Telegram
```

**Практика:** Когда ты пушишь новые идеи в `data/IDEAS-BACKLOG.json`, n8n автоматически:
- Получит уведомление
- Проверит качество через Claude
- Добавит в Google Sheets
- Напишет в Telegram

---

## 2. GitHub API для автоматизации

### 2.1 Какие операции можно делать?

| Операция | API endpoint | Для Podonki |
|----------|--------------|------------|
| Создать/обновить файл | `PUT /repos/{owner}/{repo}/contents/{path}` | Сохранить результаты парсинга |
| Создать issue | `POST /repos/{owner}/{repo}/issues` | Трекер задач контента |
| Создать release | `POST /repos/{owner}/{repo}/releases` | Версии наборов контента |
| Список коммитов | `GET /repos/{owner}/{repo}/commits` | История изменений |
| Управление secrets | `PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}` | Ротация API ключей |
| Trigger workflow | `POST /repos/{owner}/{repo}/actions/workflows/{id}/dispatches` | Запуск вручную из скрипта |

### 2.2 Пример: Автоматическое создание Issue для новой идеи

```bash
curl -X POST \
  https://api.github.com/repos/YOUR_USERNAME/podonki-content/issues \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Content idea: [TikTok trend] Best vape brands March",
    "body": "**Тип:** TikTok trend\n**Статус:** Нужна генерация\n**Тегов:** #vape #tiktok #trends\n\nGenerated: 2026-03-13",
    "labels": ["content", "tiktok", "auto-generated"],
    "assignees": ["your-username"]
  }'
```

### 2.3 Пример: Автоматическое сохранение результатов парсинга

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

async function saveScrapedDataToGitHub(data, filename) {
  const owner = 'your-username';
  const repo = 'podonki-content';
  const path = `data/${filename}`;

  const fileContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Auto-update: ${filename} (${new Date().toISOString()})`,
        content: fileContent,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to save: ${response.statusText}`);
  }

  console.log(`✅ Saved ${filename} to GitHub`);
}
```

### 2.4 Получение последних идей из репо

```python
import requests
import json

def get_ideas_from_github():
    url = "https://api.github.com/repos/YOUR_USERNAME/podonki-content/contents/data/IDEAS-BACKLOG.json"

    response = requests.get(url, headers={
        "Authorization": f"token {os.getenv('GITHUB_TOKEN')}"
    })

    if response.status_code == 200:
        content = json.loads(
            base64.b64decode(response.json()['content']).decode()
        )
        return content

    return None

ideas = get_ideas_from_github()
print(f"📚 Loaded {len(ideas)} ideas")
```

---

## 3. GitHub Secrets: Безопасное хранение API ключей

### 3.1 Как добавить Secret

1. Репо → Settings → Secrets and variables → Actions
2. "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: `sk-ant-xxxxx`
5. Add secret

### 3.2 Использование в Actions

```yaml
- name: Run script with secrets
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    POLZA_API_KEY: ${{ secrets.POLZA_API_KEY }}
  run: python scripts/main.py
```

### 3.3 Какие секреты нужны для Podonki?

```
ANTHROPIC_API_KEY          # Claude API
TELEGRAM_BOT_TOKEN         # Telegram Bot (@BotFather)
TELEGRAM_CHAT_ID           # ID Podonki канала
GITHUB_TOKEN               # Personal Access Token
POLZA_API_KEY              # Polza.ai для видео
GEMINI_API_KEY             # Google Gemini (опционально)
QDRANT_API_KEY             # Qdrant для RAG (опционально)
N8N_WEBHOOK_URL            # Для интеграции с n8n
```

### 3.4 Ротация секретов

GitHub не уведомляет об утечке. Проверяй обновления вручную:

```bash
# Если заподозрил утечку API ключа
# 1. Немедленно отменить старый ключ в сервисе
# 2. Создать новый ключ в сервисе
# 3. Обновить Secret на GitHub
# 4. Проверить логи Actions
```

---

## 4. GitHub Issues & Projects: Трекер контента

### 4.1 Структура Issues для Podonki

**Название:** `[TikTok] Best vape unboxing video ideas`

**Описание:**
```markdown
## Требование
Генерация 5 идей для TikTok видео про распаковку вейпов.

## Критерии
- [ ] Должны быть трендовыми в марте 2026
- [ ] Целевая аудитория: 16-25 лет
- [ ] Длительность: 15-60 сек
- [ ] 3+ стиля (funny, educational, challenge)

## Дедлайн
Среда, 2026-03-19

## Связанные задачи
- #42 (генерация контента)
- #45 (поиск трендов)

## Результат
[Место для результата]
```

### 4.2 Автоматизация Issues

**Workflow:** `.github/workflows/auto-issue-triage.yml`

```yaml
name: Auto-triage Issues
on:
  issues:
    types: [opened, labeled]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Add to project
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/users/YOUR_USERNAME/projects/1
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Set initial status
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            if (issue.labels.some(l => l.name === 'auto-generated')) {
              // Автоматически устанавливаем статус
              github.rest.issues.addLabels({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                labels: ['needs-review']
              });
            }
```

### 4.3 GitHub Projects: Roadmap контента

**Столбцы:**
- Backlog (свежие идеи из IDEAS-BACKLOG.json)
- In Progress (сейчас работаем)
- Review (проверка качества)
- Ready to Post (готовы публиковать)
- Published (опубликованы в Telegram/TikTok)

**Автоматизация:** Issues автоматически перемещаются между столбцами по меткам.

---

## 5. GitHub Gists: Хранение скриптов

### 5.1 Что это?

Gists — приватные (или публичные) хранилища для отдельных файлов. Не нужна целая папка репо.

### 5.2 Для Podonki:

```
Гист 1: parse-all-platforms.py (парсер конкурентов)
Гист 2: telegram-poster.py (постинг в Telegram)
Гист 3: content-generator.js (генератор идей)
Гист 4: brand-config.json (конфиг Podonki)
```

### 5.3 Создание Gist через CLI

```bash
# Создать новый Gist из файла
gh gist create scripts/telegram-poster.py --public

# Обновить существующий Gist
gh gist edit GIST_ID < scripts/telegram-poster.py

# Список Gistов
gh gist list

# Клонировать Gist в локальную папку
gh gist clone GIST_ID
```

### 5.4 Использование Gist в Workflows

```yaml
- name: Download scripts from Gist
  run: |
    curl -s https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/parse-all-platforms.py > scripts/parse-all-platforms.py
    python scripts/parse-all-platforms.py
```

---

## 6. Marketplace Actions для социальных сетей

### 6.1 Telegram Actions

Доступные в GitHub Marketplace:

1. **[appleboy/telegram-action](https://github.com/appleboy/telegram-action)** ⭐
   - Отправляет сообщение в Telegram
   - Поддерживает markdown, HTML
   - Бесплатно

   ```yaml
   - uses: appleboy/telegram-action@master
     with:
       to: ${{ secrets.TELEGRAM_CHAT_ID }}
       token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
       message: |
         ✅ Контент опубликован!

         Дата: $(date)
         Платформа: TikTok
         Статус: Live
   ```

2. **[notify-telegram](https://github.com/marketplace/actions/notify-telegram)**
   - Более простой вариант
   - Хорошо для уведомлений

3. **[TelegramBridge](https://github.com/marketplace/actions/telegrambridge)**
   - Синхронизация изменений в репо с Telegram чатом
   - Автоматические уведомления

### 6.2 RSS Feed Actions

1. **[RSS Feed Fetch Action](https://github.com/marketplace/actions/rss-feed-fetch-action)**
   - Парсит RSS ленту
   - Сохраняет результаты

   ```yaml
   - uses: swyxio/rss-to-github-action@v1
     with:
       feed-url: https://example.com/feed.xml
       output-path: data/feed.json
   ```

2. **[FeedsFetcher](https://github.com/marketplace/actions/feedsfetcher)**
   - Берет ссылки на несколько RSS
   - Создает агрегированную ленту

### 6.3 Нет готовых Actions для TikTok/Instagram

**Почему?** TikTok и Instagram закрыли API для постинга. Решение:

- Используй n8n + API интеграции (Ayrshare)
- Или вручную парсь контент через Puppeteer + Actions

---

## 7. GitHub Discussions: Коллаборация

Если захочешь работать с командой:

**Структура:**
- Announcements (уведомления о новых фичах)
- Ideas (идеи для улучшения)
- Q&A (вопросы по использованию)
- Content Feedback (обсуждение контента)

**Включение:** Settings → Features → Discussions

---

## 8. Практический план внедрения

### Фаза 1: Базовая автоматизация (неделя 1)

- [ ] Создать `.github/workflows/weekly-scrape-competitors.yml`
- [ ] Добавить Secrets (TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY)
- [ ] Тест: Запустить парсер вручную (workflow_dispatch)
- [ ] Проверить коммит в репо

**Файлы:**
- `.github/workflows/weekly-scrape-competitors.yml`
- Обновить `scripts/parse-all-platforms.py` для GitHub Actions

### Фаза 2: Генерация контента (неделя 2)

- [ ] Создать `.github/workflows/daily-content-generation.yml`
- [ ] Настроить Cron для ежедневной генерации
- [ ] Добавить уведомление в Telegram о новых идеях
- [ ] Интегрировать с Qdrant для RAG

**Файлы:**
- `.github/workflows/daily-content-generation.yml`
- Обновить `scripts/idea-generator.js` для GitHub Actions

### Фаза 3: Публикация на расписание (неделя 3)

- [ ] Создать `.github/workflows/telegram-scheduled-post.yml`
- [ ] Написать логику выбора лучшего поста
- [ ] Настроить Cron (Пн, Ср, Пт)
- [ ] Тестирование в приватном канале

**Файлы:**
- `.github/workflows/telegram-scheduled-post.yml`
- `scripts/telegram-poster.py` (новый)

### Фаза 4: Интеграция с n8n (неделя 4)

- [ ] Создать Webhook в n8n
- [ ] Настроить GitHub Webhook для репо
- [ ] Тестирование: push → n8n → Telegram
- [ ] Документация

**Файлы:**
- `.github/workflows/webhook-trigger.yml` (опционально)

---

## 9. Примеры готовых Workflows

### Пример 1: Парсинг TikTok трендов

```yaml
name: Parse TikTok Trends
on:
  schedule:
    - cron: '0 12 * * *'  # Каждый день в 12:00 UTC
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - run: pip install requests beautifulsoup4 playwright

      - name: Scrape TikTok trends
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          python -c "
          import requests
          from bs4 import BeautifulSoup
          import json
          import os
          from anthropic import Anthropic

          # Парсим публичные тренды (или используй API)
          client = Anthropic()

          trends = ['vape', 'unboxing', 'viral']
          ideas = []

          for trend in trends:
            response = client.messages.create(
              model='claude-3-5-sonnet-20241022',
              max_tokens=500,
              messages=[{
                'role': 'user',
                'content': f'Generate 3 TikTok video ideas for trend: {trend}'
              }]
            )
            ideas.append({
              'trend': trend,
              'ideas': response.content[0].text
            })

          with open('data/tiktok-trends.json', 'w') as f:
            json.dump(ideas, f, indent=2, ensure_ascii=False)
          "

      - name: Commit changes
        run: |
          git config user.email "actions@github.com"
          git config user.name "GitHub Actions"
          git add data/tiktok-trends.json
          git commit -m "Daily TikTok trends $(date +%Y-%m-%d)" || true
          git push

      - uses: appleboy/telegram-action@master
        if: success()
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ✅ TikTok trends updated
            Trends parsed: 3
            Ideas generated: 9
```

### Пример 2: Еженедельный отчет в Google Sheets

```yaml
name: Weekly Report to Sheets
on:
  schedule:
    - cron: '0 9 * * 1'  # Пн 9:00 UTC

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

      - name: Generate report
        env:
          GOOGLE_SHEETS_CREDENTIALS: ${{ secrets.GOOGLE_SHEETS_CREDENTIALS }}
        run: python scripts/weekly-report.py
```

---

## 10. Часто задаваемые вопросы

**Q: Бесплатно ли GitHub Actions?**
A: Да, для публичных репо (unlimited). Для приватных: 2000 минут/месяц бесплатно.

**Q: Можно ли запускать Actions чаще чем каждые 5 минут?**
A: Нет. Макс. частота — каждые 5 минут. Для более частых запусков — используй собственный сервер или n8n.

**Q: Как избежать утечки API ключей?**
A: Используй только Secrets, не коммитьте ключи. GitHub автоматически замаскирует секреты в логах.

**Q: Можно ли запустить Action вручную из скрипта?**
A: Да, через GitHub API + workflow_dispatch.

**Q: Куда пушить результаты парсинга?**
A: В репо (как файлы JSON), в Google Sheets, в Qdrant или в базу данных через n8n.

**Q: Интегрируется ли GitHub с Telegram?**
A: Нет встроенной интеграции, но есть Actions в Marketplace (appleboy/telegram-action и др.).

---

## 11. Дополнительные ресурсы

### Официальная документация
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

### Примеры из сообщества
- [Awesome GitHub Actions](https://github.com/sdras/awesome-actions)
- [GitHub Marketplace](https://github.com/marketplace?type=actions)
- [n8n + GitHub Integration](https://n8n.io/integrations/webhook/and/github/)

### Для Telegram интеграции
- [@BotFather](https://t.me/BotFather) — создание ботов
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot)

---

## 12. Чек-лист готовности

Перед первым запуском Actions:

- [ ] Репо создан и инициализирован
- [ ] Все скрипты работают локально
- [ ] `.env` файлы не закоммичены
- [ ] Secrets добавлены на GitHub
- [ ] `.github/workflows/` создана
- [ ] YAML синтаксис проверен (используй `yamllint`)
- [ ] Есть тестовый Telegram чат для уведомлений
- [ ] Логи Actions проверены (нет утечек ключей)
- [ ] Первый запуск сделан вручную (workflow_dispatch)
- [ ] Результаты сохранены и проверены

---

## Итого

**GitHub для Podonki = CI/CD + хранилище данных + трекер задач + интеграция с n8n.**

Не нужно запускать скрипты на своем компьютере — GitHub сделает все сам по расписанию. Результаты сохранятся в репо или через API пойдут в другие сервисы.

**Начни с фазы 1 (неделя 1) и постепенно масштабируй.**

---

**Версия:** 1.0
**Создано:** 2026-03-13
**Обновлено:** TBD
**Контакт:** @claude-haiku-4-5
