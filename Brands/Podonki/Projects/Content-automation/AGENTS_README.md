# Podonki Agents System

Система динамических агентов для автоматизации контента. Создавай, сохраняй, переиспользуй агентов под разные задачи.

## Встроенные агенты

### 1. Telegram Parser (`telegram-parser`)
Парсит посты из Telegram каналов конкурентов.
```bash
agent info telegram-parser
```
- **Input**: Telegram channel URL (@channel_name)
- **Output**: JSON с постами, engagement, анализом
- **Пример**: Парсит @greh_official, извлекает все посты за неделю

### 2. Post Generator (`post-generator`)
Генерирует посты для Telegram на основе идей и трендов.
```bash
agent info post-generator
```
- **Input**: Тема, стиль, целевая аудитория
- **Output**: Готовый пост с эмодзи и хэштегами
- **Пример**: Генерирует пост о новом вкусе "земляничная карамель"

### 3. Competitor Analyzer (`competitor-analyzer`)
Анализирует стратегии конкурентов, тренды, сильные/слабые стороны.
```bash
agent info competitor-analyzer
```
- **Input**: Посты конкурента или их список
- **Output**: Анализ стиля, engagement, gaps, opportunities
- **Пример**: Анализирует "Грех", "VLIQ", "Husky" — выявляет белые пятна

### 4. SEO Optimizer (`seo-optimizer`)
Оптимизирует тексты под SEO, читаемость, ключевые слова.
```bash
agent info seo-optimizer
```
- **Input**: Текст поста
- **Output**: Оптимизированный текст + рекомендации
- **Пример**: Берёт пост и улучшает структуру, добавляет ключевые слова

### 5. Batch Generator (`batch-generator`)
Генерирует 10+ постов за раз на неделю или месяц.
```bash
agent info batch-generator
```
- **Input**: Период (неделя/месяц), количество, тема
- **Output**: Массив постов с датами и временем постинга
- **Пример**: Генерирует недельный план из 12 постов, оптимизированный по engagement

## Команды

### Просмотр агентов
```bash
agent list              # Список всех агентов
agent info <id>         # Детали агента
agent types             # Типы агентов
```

### Управление агентами
```bash
agent create <name> <desc> <type>   # Создать новый агент
agent delete <id>                    # Удалить агент
```

### История и статистика
```bash
agent history <id> [limit]   # История запусков агента
agent stats                   # Общая статистика
```

## Как работает

### Этап 1: Создание агента
```bash
agent create "VK Parser" "Парсит VK посты конкурентов" parser
```
- Создаётся новый агент в `data/agents/configs/vk-parser.json`
- Нужно заполнить промпт в `src/agents/prompts/vk-parser.md`

### Этап 2: Использование агента
```javascript
import AgentManager from './src/agents/agent-manager.js'

const result = await AgentManager.runAgent('post-generator', {
  topic: 'new strawberry flavor',
  style: 'casual',
  audience: '16-25'
})

console.log(result.text)  // готовый пост
```

### Этап 3: История и переиспользование
```bash
agent history post-generator 10   # последние 10 запусков
```
- Каждый запуск сохраняется (timestamp, status, input/output size)
- Агент запоминает параметры (model, temperature, max_tokens)
- Следующий запуск использует те же настройки

## Структура папок

```
src/agents/
├── agent-manager.js           # Главный менеджер агентов
├── agent-config.schema.js      # Схема конфига + встроенные агенты
├── cli.js                      # CLI для управления
├── prompts/                    # Системные промпты
│   ├── telegram-parser.md
│   ├── post-generator.md
│   ├── competitor-analyzer.md
│   ├── seo-optimizer.md
│   └── batch-generator.md
└── ...

data/agents/
├── configs/                    # Сохранённые конфиги агентов
│   ├── telegram-parser.json
│   ├── post-generator.json
│   └── [custom agents...]
└── prompts/                    # Кастомные промпты (если созданы)
```

## Примеры использования

### 1. Спарсить конкурента
```bash
node src/agents/cli.js info telegram-parser
```
```javascript
await AgentManager.runAgent('telegram-parser', {
  channel: '@greh_official',
  limit: 100
})
```

### 2. Сгенерить неделю постов
```javascript
const posts = await AgentManager.runAgent('batch-generator', {
  week: '2026-03-15',
  postsCount: 12,
  theme: 'Spring flavors'
})

posts.posts.forEach(post => {
  console.log(`${post.date} ${post.time}: ${post.text}`)
})
```

### 3. Оптимизировать пост
```javascript
const optimized = await AgentManager.runAgent('seo-optimizer', {
  text: 'Новый вкус хороший. Попробуй.'
})

console.log(optimized.optimized)  // улучшенный пост
```

### 4. Анализировать конкурентов
```javascript
const analysis = await AgentManager.runAgent('competitor-analyzer', {
  competitors: ['@greh_official', '@zlaya-monashka', '@husky_official'],
  period: '2026-02-15 to 2026-03-15'
})

console.log(analysis.opportunities)  // что делать лучше
```

## Расширение: создание своего агента

1. **Создай агента в CLI:**
   ```bash
   agent create "My Agent" "Does something cool" generator
   ```

2. **Заполни промпт в `src/agents/prompts/my-agent.md`:**
   ```markdown
   # My Agent
   Ты — специалист по...
   Твоя задача — ...
   ```

3. **Используй агента:**
   ```javascript
   await AgentManager.runAgent('my-agent', { input: 'data' })
   ```

4. **Посмотри историю:**
   ```bash
   agent history my-agent
   ```

## Интеграция с n8n

В будущем агенты будут запускаться через n8n вебхуки:
```
n8n trigger → agent.runAgent() → результат → Telegram/VK
```

Например:
- Расписание (каждый день в 19:00) → `batch-generator` → `post-generator` → публикация в TG
- Клик кнопки → `telegram-parser` → парсинг конкурента → обновление анализа

## Статистика и оптимизация

```bash
agent stats
```

Показывает:
- Всего агентов: 5
- Встроенных: 5
- Кастомных: 0
- Всего запусков: 42
- Самый используемый: post-generator (18 раз)

На основе этого можно:
- Улучшать популярные агенты
- Удалять неиспользуемые
- Добавлять новые функции в часто используемые

## Следующие шаги

- [ ] Интеграция с Claude API (реальные запросы вместо mock)
- [ ] Интеграция с n8n (вебхуки, расписание)
- [ ] Интеграция с БД (сохранение результатов)
- [ ] Web UI для управления агентами
- [ ] Параллельное выполнение агентов (очередь)
- [ ] A/B тестирование (сравнение разных версий агента)
