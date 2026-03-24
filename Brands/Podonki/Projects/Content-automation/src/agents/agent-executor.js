import Anthropic from '@anthropic-ai/sdk'
import AgentManager from './agent-manager.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROMPTS_DIR = path.join(__dirname, 'prompts')

const client = new Anthropic()

// Получи список доступных агентов с их промптами
const getAvailableAgents = () => {
  const agents = AgentManager.listAgents()
  return agents.map(agent => {
    const promptPath = path.join(PROMPTS_DIR, `${agent.id}.md`)
    let systemPrompt = ''

    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, 'utf-8')
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      type: agent.type,
      inputs: agent.inputs,
      outputs: agent.outputs,
      systemPrompt,
    }
  })
}

// Claude выбирает агента на основе задачи
export const selectAgent = async (userTask) => {
  const agents = getAvailableAgents()

  const agentsList = agents
    .map(
      (a, i) =>
        `${i + 1}. **${a.name}** (${a.type})\n   ${a.description}\n   Input: ${a.inputs.type} - ${a.inputs.description}\n   Output: ${a.outputs.type} - ${a.outputs.description}`
    )
    .join('\n\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    system: `Ты — оркестратор агентов Podonki. Твоя задача — выбрать нужного агента на основе задачи пользователя.

Доступные агенты:

${agentsList}

На основе задачи выбери ОДИН подходящий агент. Ответь в формате JSON:
{
  "agentId": "agent-id",
  "reason": "почему выбран этот агент",
  "inputData": { что передать агенту }
}

Если ни один агент не подходит, верни:
{
  "agentId": null,
  "reason": "причина",
  "suggestion": "что создать/добавить"
}`,
    messages: [
      {
        role: 'user',
        content: userTask,
      },
    ],
  })

  try {
    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { agentId: null, reason: 'Failed to parse' }
  } catch (error) {
    return { agentId: null, reason: 'Failed to select agent', error: error.message }
  }
}

// Запусти выбранного агента с промптом
export const executeAgent = async (agentId, inputData, options = {}) => {
  const agent = AgentManager.getAgent(agentId)
  if (!agent) {
    throw new Error(`Agent "${agentId}" not found`)
  }

  const promptPath = path.join(PROMPTS_DIR, `${agentId}.md`)
  const systemPrompt = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8') : ''

  if (!systemPrompt) {
    throw new Error(`No prompt found for agent "${agentId}"`)
  }

  const response = await client.messages.create({
    model: options.model || agent.parameters?.model || 'claude-opus-4-6',
    max_tokens: options.max_tokens || agent.parameters?.max_tokens || 2000,
    temperature: options.temperature || agent.parameters?.temperature || 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${JSON.stringify(inputData, null, 2)}`,
      },
    ],
  })

  const result = response.content[0].type === 'text' ? response.content[0].text : ''

  // Сохрани историю запуска
  await AgentManager.runAgent(agentId, inputData, { result })

  return {
    agentId,
    agentName: agent.name,
    success: true,
    result: result,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

// Полный цикл: выбери → запусти → результат
export const autoRunAgent = async (userTask, options = {}) => {
  console.log(`\n🤖 Auto-selecting agent for: "${userTask}"\n`)

  // Шаг 1: Выбери агента
  const selection = await selectAgent(userTask)

  if (!selection.agentId) {
    console.log(`❌ No suitable agent found`)
    console.log(`   Reason: ${selection.reason}`)
    if (selection.suggestion) {
      console.log(`   Suggestion: ${selection.suggestion}`)
    }
    return { success: false, selection }
  }

  console.log(`✅ Selected agent: ${selection.agentId}`)
  console.log(`   Reason: ${selection.reason}`)
  console.log(`   Input data: ${JSON.stringify(selection.inputData, null, 2)}\n`)

  // Шаг 2: Запусти агента
  const result = await executeAgent(selection.agentId, selection.inputData, options)

  console.log(`✅ Agent executed successfully`)
  console.log(`   Tokens used: ${result.usage.inputTokens} input, ${result.usage.outputTokens} output\n`)

  // Шаг 3: Спарсь результат
  let parsedResult = result.result
  try {
    const jsonMatch = result.result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    // Оставь как текст если не JSON
  }

  return {
    success: true,
    selection,
    result: {
      agentId: result.agentId,
      agentName: result.agentName,
      output: parsedResult,
      usage: result.usage,
    },
  }
}

// Запусти несколько агентов параллельно (для batch операций)
export const parallelRunAgents = async (tasks) => {
  console.log(`\n🚀 Running ${tasks.length} tasks in parallel\n`)

  const results = await Promise.all(tasks.map(task => autoRunAgent(task.task, task.options)))

  const summary = {
    total: tasks.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total: ${summary.total}`)
  console.log(`   Success: ${summary.successful}`)
  console.log(`   Failed: ${summary.failed}\n`)

  return summary
}
