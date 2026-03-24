import Anthropic from '@anthropic-ai/sdk'
import AgentManager from './agent-manager.js'
import { AGENT_TYPES } from './agent-config.schema.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROMPTS_DIR = path.join(__dirname, 'prompts')

const client = new Anthropic()

// Claude создаёт нового агента на основе задачи
export const createAgentForTask = async (taskDescription) => {
  console.log(`\n🆕 Creating new agent for task: "${taskDescription}"\n`)

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    system: `Ты — архитектор агентов для Podonki. На основе описания задачи создай конфигурацию нового агента.

Твоя задача — вернуть JSON с описанием агента:
{
  "name": "Понятное имя агента",
  "description": "Краткое описание что делает",
  "type": "parser|generator|analyzer|optimizer",
  "skills": ["какие файлы/функции использует"],
  "inputs": {
    "type": "json|csv|text|url",
    "description": "Какие данные нужны"
  },
  "outputs": {
    "type": "json|text|csv",
    "description": "Что выдаёт"
  },
  "parameters": {
    "model": "claude-opus-4-6",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}

Типы агентов:
- parser: парсит/извлекает данные
- generator: генерирует контент
- analyzer: анализирует данные
- optimizer: оптимизирует/улучшает

Думай логично и практично.`,
    messages: [
      {
        role: 'user',
        content: taskDescription,
      },
    ],
  })

  try {
    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const agentConfig = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!agentConfig) {
      throw new Error('Failed to parse agent config')
    }

    // Создай агента
    const agent = AgentManager.createAgent(
      agentConfig.name,
      agentConfig.description,
      agentConfig.type,
      '', // role будет заполнено в createPrompt
      {
        skills: agentConfig.skills,
        inputs: agentConfig.inputs,
        outputs: agentConfig.outputs,
        parameters: agentConfig.parameters,
      }
    )

    console.log(`✅ Agent created: ${agent.id}`)
    console.log(`   Name: ${agent.name}`)
    console.log(`   Type: ${agent.type}`)
    console.log(`   Description: ${agent.description}\n`)

    // Создай промпт для агента
    await createAgentPrompt(agent.id, taskDescription, agentConfig)

    return { success: true, agent }
  } catch (error) {
    console.error(`❌ Failed to create agent: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Claude генерирует системный промпт для агента
const createAgentPrompt = async (agentId, taskDescription, config) => {
  console.log(`📝 Generating prompt for ${agentId}...`)

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: `Ты — специалист по написанию системных промптов для AI агентов.

Напиши профессиональный системный промпт для агента. Промпт должен быть:
1. Чётким и конкретным
2. Практичным (с примерами форматов)
3. Содержать инструкции что делать/не делать
4. Включать примеры результатов

Пиши на русском, профессионально, но доступно.

Вот конфиг агента:
Name: ${config.name}
Type: ${config.type}
Description: ${config.description}
Input: ${config.inputs.description}
Output: ${config.outputs.description}`,
    messages: [
      {
        role: 'user',
        content: `Создай промпт для следующей задачи:\n\n${taskDescription}`,
      },
    ],
  })

  const prompt = response.content[0].type === 'text' ? response.content[0].text : ''

  // Сохрани промпт
  const promptPath = path.join(PROMPTS_DIR, `${agentId}.md`)
  fs.writeFileSync(promptPath, `# ${config.name} Agent\n\n${prompt}`)

  console.log(`✅ Prompt saved to: ${promptPath}\n`)
}

// Проверь нужен ли новый агент или можно переиспользовать существующий
export const suggestAgent = async (taskDescription) => {
  const agents = AgentManager.listAgents()
  const agentsList = agents
    .map(a => `- ${a.name} (${a.type}): ${a.description}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    system: `Ты — помощник в выборе агентов для Podonki.

Доступные агенты:
${agentsList}

На основе задачи пользователя выбери:
1. Можно ли переиспользовать существующий агент
2. Нужно ли создавать новый

Ответь в JSON:
{
  "recommendation": "existing|new",
  "agentId": "agent-id if existing, null if new",
  "agentName": "агент который подходит или null",
  "reason": "объяснение",
  "newAgentSuggestion": "если нужен новый — описание задачи для создания"
}`,
    messages: [
      {
        role: 'user',
        content: taskDescription,
      },
    ],
  })

  try {
    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendation: 'new', reason: 'Parse error' }
  } catch (error) {
    return { recommendation: 'new', reason: 'Failed to parse suggestion' }
  }
}
