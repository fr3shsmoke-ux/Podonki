# Автоматическое управление агентами

Claude **сам выбирает и запускает** нужного агента на основе твоей задачи.

## Как это работает

### 1️⃣ Простой запуск

```javascript
import { autoRunAgent } from './src/agents/index.js'

// Claude сам выберет подходящего агента и запустит его
const result = await autoRunAgent('Сгенери пост о новом вкусе земляничка')

console.log(result.result.output)  // готовый пост
```

**Что происходит внутри:**
1. Claude анализирует задачу
2. Выбирает подходящего агента из имеющихся (Telegram Parser, Post Generator, и т.д.)
3. Запускает агента с промптом из `src/agents/prompts/`
4. Возвращает результат

### 2️⃣ Автоматическое создание агента

Если Claude не найдёт подходящего агента — **создаст новый**:

```javascript
import { suggestAgent, createAgentForTask } from './src/agents/index.js'

// Проверь нужен ли новый агент
const suggestion = await suggestAgent('Анализировать TikTok тренды')

if (suggestion.recommendation === 'new') {
  // Создай новый агент
  await createAgentForTask(suggestion.newAgentSuggestion)
}

// Теперь можно использовать
await autoRunAgent('Анализировать TikTok тренды')
```

### 3️⃣ Параллельное выполнение

Несколько задач одновременно:

```javascript
import { parallelRunAgents } from './src/agents/index.js'

const results = await parallelRunAgents([
  { task: 'Сгенери 3 поста' },
  { task: 'Спарсь конкурента @greh' },
  { task: 'Оптимизируй текст на SEO' },
])

console.log(results.successful)  // сколько успешно
```

## Команды

```bash
# Управление агентами
npm run agent:list              # Список всех
npm run agent:info              # Детали агента
npm run agent:stats             # Статистика

# Примеры
npm run agent:example           # Запусти простой пример
npm run agent:batch             # Генерируй неделю постов
```

## Примеры использования

### Генерация контента

```javascript
// Один пост
const post = await autoRunAgent('Сгенери пост про новый вкус мятная сливка')

// Неделю постов
const week = await autoRunAgent('Сгенери 12 постов на неделю, тема "Весна"')

// С настройками
const customPost = await autoRunAgent('Сгенери пост про льдистый холод', {
  temperature: 0.5,  // более консервативный стиль
  max_tokens: 1000,  // ограничь длину
})
```

### Анализ конкурентов

```javascript
// Один конкурент
const analysis = await autoRunAgent('Анализируй стратегию @greh_official')

// Несколько параллельно
const results = await parallelRunAgents([
  { task: 'Анализируй @greh_official' },
  { task: 'Анализируй @zlaya-monashka' },
  { task: 'Анализируй @husky_official' },
])
```

### Оптимизация

```javascript
// SEO оптимизация
const optimized = await autoRunAgent('Оптимизируй текст: "Новый вкус хороший"')

// Parse & optimize
const optimized2 = await autoRunAgent('Спарсь посты @competitor и оптимизируй стиль')
```

## Автоматическое создание агентов

### Сценарий 1: Новая платформа

```javascript
// Нужен парсер VK
const vkParser = await createAgentForTask(
  'Создай агента, который парсит посты из VK групп конкурентов вейпа'
)

// Теперь можно использовать
await autoRunAgent('Спарсь посты из https://vk.com/...')
```

### Сценарий 2: Новый тип контента

```javascript
// Нужен агент для рейтингов
const ratingAgent = await createAgentForTask(
  'Создай агента, который собирает и рейтирует вкусы по популярности'
)

// Использование
await autoRunAgent('Собери топ-10 самых популярных вкусов этого месяца')
```

### Сценарий 3: Специальная обработка

```javascript
// Нужен агент для TikTok
const tiktokAgent = await createAgentForTask(
  'Анализировать TikTok видео про вейп - тренды, звуки, хэштеги, создавать свои варианты'
)

// Использование
await autoRunAgent('Найди top TikTok видео про вейп за неделю')
```

## Интеграция с n8n

В будущем:

```
n8n Webhook → autoRunAgent() → результат → Telegram/VK
```

Пример workflow:
1. **Trigger**: расписание (каждый день в 19:00)
2. **Action**: `autoRunAgent('сгенери пост на день')`
3. **Action**: отправить в Telegram через бот
4. **Repeat** ночью

## Логирование и debug

```javascript
// Claude показывает свой процесс выбора агента
const result = await autoRunAgent('твоя задача')

console.log(result.selection)  // какой агент выбран и почему
console.log(result.result)     // результат выполнения
```

## Статистика

```bash
npm run agent:stats
```

Показывает:
- Всего агентов: X
- Встроенных: X
- Созданных: X
- Всего запусков: X
- Самый используемый: X

## Будущие улучшения

- [ ] Fine-tuning для выбора агента (учитывать историю)
- [ ] Цепочки агентов (агент A → агент B → агент C)
- [ ] Кеширование результатов (если такая же задача — используй кеш)
- [ ] A/B тестирование (сравнивай версии агентов)
- [ ] Web UI для управления и просмотра истории
- [ ] Feedback loop (Claude учится на результатах)

## Quick reference

| Задача | Код |
|--------|-----|
| Сгенери пост | `autoRunAgent('Сгенери пост о...')` |
| Спарсь конкурента | `autoRunAgent('Спарсь @competitor')` |
| Анализ конкурентов | `autoRunAgent('Анализируй стратегию...')` |
| Оптимизируй текст | `autoRunAgent('Оптимизируй текст...')` |
| Генерируй неделю | `autoRunAgent('Сгенери неделю постов')` |
| Несколько задач | `parallelRunAgents([...])` |
| Новый агент | `createAgentForTask('описание задачи')` |
| Проверь агент | `suggestAgent('описание задачи')` |
| Список агентов | `npm run agent:list` |
