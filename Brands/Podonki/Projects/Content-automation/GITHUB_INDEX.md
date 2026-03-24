# GitHub для Podonki — Индекс документации

**Создано:** 13 марта 2026
**Версия:** 1.0
**Объём:** 4 гайда + 3 примера workflows + 2 API примера

---

## 📚 Документация (читать в этом порядке)

### 1. **GITHUB_QUICKSTART.md** ⚡ **НАЧНИ ОТСЮДА**
   - Быстрая настройка (30 минут)
   - PAT + Secrets
   - Первые workflows
   - Расписание (Cron)
   - Мониторинг ошибок

   **Для кого:** Хочешь быстро запустить автоматизацию

---

### 2. **GITHUB_AUTOMATION_GUIDE.md** 📖 **ПОЛНЫЙ ГАЙД**
   - Что такое GitHub Actions
   - 4 основных сценария для Podonki
   - GitHub API (примеры кода)
   - Secrets & Security
   - Issues & Projects для трекинга
   - GitHub Gists для скриптов
   - Marketplace Actions
   - 4 фазы внедрения (неделя за неделей)
   - 12 разделов + FAQ

   **Для кого:** Понять все возможности GitHub для контента

---

### 3. **GITHUB_N8N_INTEGRATION.md** 🔗 **ИНТЕГРАЦИЯ**
   - Webhook GitHub → n8n
   - Простые и advanced workflows
   - Отправка в Telegram, Google Sheets, Qdrant
   - Обработка результатов парсинга
   - Создание Issues из идей
   - RAG с Qdrant
   - Troubleshooting

   **Для кого:** Хочешь объединить GitHub + n8n + другие сервисы

---

## 🚀 Workflows (готовые к использованию)

### `.github/workflows/`

#### **weekly-competitors-parse.yml**
```
Что делает: Парсит 9 конкурентов
Расписание: Пн 10:00 UTC (13:00 МСК)
Результат: data/COMPETITORS-TRACKING.json
Уведомление: Telegram
```

#### **daily-ideas-generation.yml**
```
Что делает: Генерирует 5 идей через Claude API
Расписание: Каждый день 23:00 UTC (02:00 МСК)
Результат: data/IDEAS-BACKLOG.json
Уведомление: Telegram
```

#### **scheduled-telegram-posting.yml**
```
Что делает: Публикует лучшую идею в Telegram
Расписание: Пн/Ср/Пт 18:00 UTC (21:00 МСК)
Результат: Post в канале Podonki
Уведомление: Подтверждение в Telegram
```

---

## 💻 Примеры кода

### `scripts/github-api-examples.js` (Node.js)
```javascript
const GitHubAPI = require('./scripts/github-api-examples');
const github = new GitHubAPI();

// Создать Issue
await github.createContentIssue('Title', 'Description', ['tags']);

// Добавить идею в IDEAS-BACKLOG
await github.addIdeaToBacklog({ title: '...', type: '...', ... });

// Триггер workflow
await github.triggerContentGeneration();
```

---

### `scripts/github-api-examples.py` (Python)
```python
from scripts.github_api_examples import GitHubAPI

github = GitHubAPI()

# Создать Issue
github.create_content_issue('Title', 'Description', ['tags'])

# Добавить идею
github.add_idea_to_backlog({ 'title': '...', 'type': '...', ... })

# Триггер workflow
github.trigger_content_generation()
```

---

## 🔐 Secrets (обязательные)

```
GITHUB_TOKEN              # Personal Access Token
ANTHROPIC_API_KEY         # Claude API
TELEGRAM_BOT_TOKEN        # Telegram Bot (@BotFather)
TELEGRAM_CHAT_ID          # Telegram Channel/Chat ID
```

---

## ⏰ Расписание

| Workflow | Когда | Время UTC | Время МСК |
|----------|-------|-----------|-----------|
| Weekly parsing | Пн | 10:00 | 13:00 |
| Daily generation | Каждый день | 23:00 | 02:00 |
| Telegram posting | Пн/Ср/Пт | 18:00 | 21:00 |

---

## 🔄 Интеграции

- **GitHub ↔ n8n** — Webhook обработка результатов
- **GitHub ↔ Telegram** — Уведомления о событиях
- **GitHub ↔ Google Sheets** — Аналитика в таблицах
- **GitHub ↔ Claude API** — Генерация контента

---

## ✅ Чек-лист готовности

- [ ] Создан Personal Access Token (PAT)
- [ ] Добавлены Secrets в GitHub
- [ ] Telegram bot создан (@BotFather)
- [ ] `.github/workflows/*.yml` скопированы в репо
- [ ] Первый workflow запущен вручную
- [ ] Результаты проверены (репо + Telegram)

---

## 📖 Дополнительные ресурсы

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Awesome GitHub Actions](https://github.com/sdras/awesome-actions)
- [n8n + GitHub](https://n8n.io/integrations/webhook/and/github/)

---

## 🎓 Оптимальный путь обучения

1. Прочитать **GITHUB_QUICKSTART.md** (15 мин)
2. Добавить Secrets и запустить первый workflow (10 мин)
3. Проверить результат (5 мин)
4. Прочитать **GITHUB_AUTOMATION_GUIDE.md** (1-2 часа)
5. Экспериментировать с workflows (1+ часа)
6. Настроить n8n интеграцию (30 мин)

**Итого:** ~3-4 часа от нуля до полной автоматизации

---

## 🏆 Результат

После настройки:
- ✅ Еженедельный автоматический парсинг конкурентов
- ✅ Ежедневная генерация 5 новых идей
- ✅ Автоматический постинг в Telegram 3 раза в неделю
- ✅ Все данные сохраняются в репо с историей
- ✅ Telegram получает уведомления в реальном времени

**Это экономит 2-3 часа в неделю ручной работы!**

---

**Начни с GITHUB_QUICKSTART.md — 30 минут и готово! 🚀**
