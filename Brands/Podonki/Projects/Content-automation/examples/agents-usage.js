/**
 * Примеры использования системы агентов
 * Запусти: node examples/agents-usage.js --mode <mode>
 */

import { autoRunAgent, createAgentForTask, suggestAgent } from '../src/agents/index.js'

// Режимы
const modes = {
  // 1️⃣ Простой запуск существующего агента
  simple: async () => {
    console.log('=== Mode: Simple (Run existing agent) ===\n')

    const result = await autoRunAgent('Сгенери пост для Telegram о новом вкусе земляничка с карамелью')

    if (result.success) {
      console.log('📝 Generated post:')
      console.log(result.result.output)
    }
  },

  // 2️⃣ Парсинг конкурента
  parse: async () => {
    console.log('=== Mode: Parse competitor ===\n')

    const result = await autoRunAgent('Спарсь посты из Telegram канала @greh_official за последнюю неделю')

    if (result.success) {
      console.log('📊 Parsed posts:')
      console.log(JSON.stringify(result.result.output, null, 2))
    }
  },

  // 3️⃣ Анализ конкурента
  analyze: async () => {
    console.log('=== Mode: Analyze competitors ===\n')

    const result = await autoRunAgent(
      'Проанализируй стратегию конкурентов Грех, VLIQ, Husky - их посты, стиль, frequency, engagement'
    )

    if (result.success) {
      console.log('📈 Competitor analysis:')
      console.log(JSON.stringify(result.result.output, null, 2))
    }
  },

  // 4️⃣ Оптимизация поста
  optimize: async () => {
    console.log('=== Mode: Optimize post ===\n')

    const result = await autoRunAgent(
      'Оптимизируй этот пост: "Новый вкус хороший. Попробуй земляничку. Классный вкус"'
    )

    if (result.success) {
      console.log('✨ Optimized post:')
      console.log(result.result.output)
    }
  },

  // 5️⃣ Генерация недельного плана
  batch: async () => {
    console.log('=== Mode: Generate weekly plan ===\n')

    const result = await autoRunAgent(
      'Сгенери 12 постов для Telegram на неделю 15-21 марта, тема "Весенние вкусы", 2 поста в день'
    )

    if (result.success) {
      console.log('📅 Weekly plan:')
      console.log(JSON.stringify(result.result.output, null, 2))
    }
  },

  // 6️⃣ Проверка: существующий или новый агент
  suggest: async () => {
    console.log('=== Mode: Suggest agent ===\n')

    const suggestion = await suggestAgent('Проанализировать TikTok тренды в категории вейпа за последний месяц')

    console.log('💡 Suggestion:')
    console.log(JSON.stringify(suggestion, null, 2))

    if (suggestion.recommendation === 'new') {
      console.log('\n🆕 Creating new agent...\n')
      const createResult = await createAgentForTask(suggestion.newAgentSuggestion)
      if (createResult.success) {
        console.log(`✅ New agent created: ${createResult.agent.id}`)
      }
    }
  },

  // 7️⃣ Создай совсем новый агент
  create: async () => {
    console.log('=== Mode: Create new agent ===\n')

    const newTask = 'Ты специалист по VK. Твоя задача парсить посты из VK групп конкурентов'
    const createResult = await createAgentForTask(newTask)

    if (createResult.success) {
      console.log(`✅ New agent created: ${createResult.agent.id}`)
      console.log(`   Name: ${createResult.agent.name}`)
      console.log(`   Type: ${createResult.agent.type}`)
    }
  },

  // 8️⃣ Параллельное выполнение (несколько задач одновременно)
  parallel: async () => {
    console.log('=== Mode: Parallel execution ===\n')

    const { parallelRunAgents } = await import('../src/agents/index.js')

    const tasks = [
      {
        task: 'Сгенери 3 поста для Telegram о новых вкусах',
        options: { max_tokens: 1000 },
      },
      {
        task: 'Спарсь последние 5 постов из @zlaya-monashka',
        options: { max_tokens: 1500 },
      },
      {
        task: 'Оптимизируй этот текст на SEO: Новый вкус земляничка',
        options: { temperature: 0.5 },
      },
    ]

    const summary = await parallelRunAgents(tasks)

    console.log('✅ All tasks completed:')
    summary.results.forEach((r, i) => {
      console.log(`   Task ${i + 1}: ${r.success ? '✅ Success' : '❌ Failed'}`)
    })
  },

  // 9️⃣ Кастомный вызов (полная модель)
  custom: async () => {
    console.log('=== Mode: Custom ===\n')

    // Пример: полный цикл для реального использования
    const taskDescription = 'Напиши 5 вариантов поста о акции "скидка 30% на все вкусы"'

    console.log(`Task: "${taskDescription}"\n`)

    // Шаг 1: Проверь есть ли подходящий агент
    const suggestion = await suggestAgent(taskDescription)
    console.log(`Suggestion: ${suggestion.recommendation}\n`)

    // Шаг 2: Если нет - создай новый
    if (suggestion.recommendation === 'new') {
      console.log('Creating new agent for promotional content...\n')
      // const newAgent = await createAgentForTask(suggestion.newAgentSuggestion)
    }

    // Шаг 3: Запусти
    const result = await autoRunAgent(taskDescription)

    if (result.success) {
      console.log('✅ Result:')
      console.log(result.result.output)
    }
  },
}

// Запусти выбранный режим
const mode = process.argv[3] || 'simple'

if (!modes[mode]) {
  console.log('Available modes:')
  Object.keys(modes).forEach(m => console.log(`  - ${m}`))
  console.log('\nUsage: node examples/agents-usage.js --mode <mode>')
  process.exit(1)
}

console.log(`Running mode: ${mode}\n`)
modes[mode]().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})
