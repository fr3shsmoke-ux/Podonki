# GitHub Automation Quickstart для Podonki

**Время на настройку:** 30 минут

---

## 1️⃣ Основная настройка (5 минут)

### 1.1 Создать Personal Access Token (PAT)

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)"
3. Выбрать scopes:
   - `repo` (полный доступ к репо)
   - `workflow` (управление Actions)
   - `gist` (работа с Gists)
4. Скопировать токен (больше не покажется!)
5. Сохранить в файл `~/.github-token` или переменной окружения `GITHUB_TOKEN`

### 1.2 Добавить Secrets в репо

1. Репо → Settings → Secrets and variables → Actions → New repository secret
2. Добавить эти Secrets:

```
GITHUB_TOKEN = ваш_pat_выше
ANTHROPIC_API_KEY = sk-ant-xxxxx
TELEGRAM_BOT_TOKEN = 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID = -1001234567890
```

**Как получить Telegram данные:**
- BotToken: пишем @BotFather в Telegram, `/newbot`, выбираем имя
- ChatID: пишем @userinfobot в канал, получаем ID

---

## 2️⃣ Workflows — готовые шаблоны (10 минут)

### Вариант A: Парсинг конкурентов еженедельно

Файл уже создан: `.github/workflows/weekly-competitors-parse.yml`

**Запустить первый раз:**
1. GitHub → Actions → "Weekly Competitors Parsing"
2. "Run workflow" → зелёная кнопка
3. Ждать 5-10 минут

**Результат:** `data/COMPETITORS-TRACKING.json` обновится, уведомление в Telegram

### Вариант B: Генерация идей ежедневно

Файл уже создан: `.github/workflows/daily-ideas-generation.yml`

**Запустить первый раз:**
1. GitHub → Actions → "Daily Ideas Generation"
2. "Run workflow"
3. Ждать 2-3 минуты

**Результат:** `data/IDEAS-BACKLOG.json` обновится

### Вариант C: Постинг в Telegram Пн/Ср/Пт

Файл уже создан: `.github/workflows/scheduled-telegram-posting.yml`

**Запустить первый раз:**
1. GitHub → Actions → "Scheduled Telegram Posting"
2. "Run workflow"
3. Проверить Telegram канал

**Результат:** Лучшая идея из backlog опубликуется в канал

---

## 3️⃣ Использование GitHub API (10 минут)

### Пример 1: Создать Issue для каждой идеи

```bash
node scripts/github-api-examples.js
```

Или в своем скрипте:

```javascript
const GitHubAPI = require('./scripts/github-api-examples');

const github = new GitHubAPI();
await github.createContentIssue(
  '[TikTok] New vape trend ideas',
  'Идеи для TikTok видео',
  ['tiktok', 'content']
);
```

### Пример 2: Добавить идею в IDEAS-BACKLOG из скрипта

```python
import os
from scripts.github_api_examples import GitHubAPI

github = GitHubAPI()
github.add_idea_to_backlog({
    'title': 'Новая идея контента',
    'description': 'Описание идеи',
    'type': 'video',
    'platform': 'tiktok',
    'tags': ['vape', 'viral'],
})
```

### Пример 3: Триггер workflow из скрипта

```python
# Запустить парсинг вручную
github.trigger_competitors_parsing('tiktok')

# Запустить генерацию контента
github.trigger_content_generation()

# Запустить публикацию с выбранной идеей (#2 в списке)
github.trigger_telegram_posting(idea_index=2)
```

---

## 4️⃣ Интеграция с n8n (5 минут)

### Шаг 1: Создать Webhook в GitHub

1. Репо → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-n8n.instance/webhook/podonki-github`
3. Content type: `application/json`
4. Trigger события:
   - `push` (когда пушим в репо)
   - `pull_request` (PR)
   - `issues` (создание Issues)
5. Active ✅
6. Add webhook

### Шаг 2: В n8n создать workflow

```
GitHub Webhook (trigger)
  ↓
Filter: if path contains 'data/'
  ↓
Parse JSON
  ↓
Notify in Telegram: "Обновлено: ${{ $json.commits[0].message }}"
  ↓
(опционально) Send to Google Sheets
```

**Готовое решение:** https://n8n.io/workflows/2435

---

## 5️⃣ Что настроить вручную (одноразово)

- [ ] Создать Personal Access Token
- [ ] Добавить Secrets в GitHub
- [ ] Убедиться, что Telegram bot работает
- [ ] Запустить первый workflow вручную
- [ ] Проверить результат (файл + уведомление)
- [ ] Добавить Webhook в GitHub для n8n (если нужна интеграция)

---

## 6️⃣ Расписание (Cron) — как изменить

### Текущее расписание:

```yaml
# Парсинг конкурентов: Пн 10:00 UTC (13:00 МСК)
- cron: '0 10 * * 1'

# Генерация контента: каждый день 23:00 UTC (02:00 МСК)
- cron: '0 23 * * *'

# Постинг в Telegram: Пн/Ср/Пт 18:00 UTC (21:00 МСК)
- cron: '0 18 * * 1,3,5'
```

### Как изменить?

1. Редактировать файл `.github/workflows/xxx.yml`
2. Найти секцию `schedule:`
3. Заменить `cron: '0 10 * * 1'` на новое время

**Cron формат:** `минута час день месяц день_недели`

**Примеры:**
- `'0 9 * * *'` = каждый день 9:00 UTC
- `'*/30 * * * *'` = каждые 30 минут
- `'0 0 * * 0'` = каждое воскресенье в 00:00
- `'0 12 1 * *'` = 1-го числа каждого месяца в 12:00

**Важно:** GitHub использует UTC, а не локальное время!

---

## 7️⃣ Мониторинг и отладка

### Где смотреть логи?

GitHub → Actions → Выберите workflow → Нажмите на последний run

### Если что-то не работает:

1. ✅ Проверить, что Secrets добавлены (Settings → Secrets)
2. ✅ Проверить синтаксис YAML (используй `yamllint`)
3. ✅ Проверить логи run'а на ошибки
4. ✅ Убедиться, что ключи не истекли (Telegram bot, Claude API)
5. ✅ Запустить локально: `node scripts/xxx.js` или `python scripts/xxx.py`

### Отправить тестовое уведомление в Telegram:

```bash
curl -X POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=✅ Test message from GitHub Actions"
```

---

## 8️⃣ Следующие шаги

После первой недели:

- [ ] Добавить RSS Feed парсер (для отслеживания трендов)
- [ ] Создать Issues Template (для стандартизации)
- [ ] Добавить автоматические комментарии в Issues
- [ ] Интегрировать с Google Sheets для аналитики
- [ ] Добавить слак или другой мессенджер для уведомлений
- [ ] Настроить ежемесячные релизы контента

---

## 9️⃣ Файлы в проекте

Что создано для Podonki:

```
.github/workflows/
├── daily-ideas-generation.yml       ← Генерация идей ежедневно
├── weekly-competitors-parse.yml     ← Парсинг конкурентов еженедельно
├── scheduled-telegram-posting.yml   ← Постинг в Telegram Пн/Ср/Пт
└── sonar.yml                        ← Качество кода (уже был)

scripts/
├── github-api-examples.js           ← JS примеры GitHub API
└── github-api-examples.py           ← Python примеры GitHub API

GITHUB_AUTOMATION_GUIDE.md            ← Полный гайд (это ты сейчас читаешь)
GITHUB_QUICKSTART.md                  ← Быстрый старт
```

---

## 🔟 FAQ за 30 секунд

**Q: Запуск Workflow'а бесплатный?**
A: Да! 2000 минут/месяц на приватных репо. На публичных — бесплатно.

**Q: Можно ли запускать Actions без расписания?**
A: Да, кнопка "Run workflow" вручную или через API.

**Q: Что если API ключ истек?**
A: Обновить ключ в сервисе, затем обновить Secret на GitHub.

**Q: Публичный репо = утечка данных?**
A: Нет. Secrets шифруются. Коммиты видны, но скрытные данные нет.

**Q: Можно ли запустить Actions на своем сервере?**
A: Да, через Self-hosted runners. Но для Podonki облако достаточно.

---

## 📞 Когда обращаться за помощью

**GitHub Actions не запускается?**
- Проверить YAML синтаксис
- Проверить что файл в `.github/workflows/`

**Telegram не получает уведомления?**
- Проверить TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID
- Убедиться что бот добавлен в канал/чат

**API ошибка 401?**
- Проверить GITHUB_TOKEN (может быть истекшим)
- Проверить ANTHROPIC_API_KEY если используется Claude

**Скрипт работает локально, но не в Actions?**
- Проверить что все зависимости в `requirements.txt` или `package.json`
- Проверить пути к файлам (относительные, не абсолютные)

---

**Status:** ✅ Ready to use

**Created:** 2026-03-13

**For:** Podonki Content Automation via GitHub

---

## Начать сейчас:

1. Создать PAT (5 мин)
2. Добавить Secrets (5 мин)
3. Запустить первый workflow (10 мин)
4. Проверить результат (5 мин)

**Итого: 25 минут до первого автоматического парсинга конкурентов! 🚀**
