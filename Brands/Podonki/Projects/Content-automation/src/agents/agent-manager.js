import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BUILT_IN_AGENTS } from './agent-config.schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AGENTS_DIR = path.join(__dirname, '../../data/agents')
const CONFIGS_DIR = path.join(AGENTS_DIR, 'configs')
const PROMPTS_DIR = path.join(AGENTS_DIR, 'prompts')

// Создай структуру папок
const ensureStructure = () => {
  ;[AGENTS_DIR, CONFIGS_DIR, PROMPTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

export class AgentManager {
  constructor() {
    ensureStructure()
    this.agents = new Map()
    this.loadBuiltInAgents()
  }

  // Загрузи встроенные агенты
  loadBuiltInAgents() {
    Object.entries(BUILT_IN_AGENTS).forEach(([id, config]) => {
      this.agents.set(id, {
        id,
        ...config,
        builtIn: true,
        usageCount: 0,
        history: [],
        createdAt: new Date().toISOString(),
      })
    })
  }

  // Создай новый агент под задачу
  createAgent(name, description, type, role, options = {}) {
    const id = name.toLowerCase().replace(/\s+/g, '-')

    // Проверь уникальность
    if (this.agents.has(id)) {
      throw new Error(`Agent "${id}" already exists`)
    }

    const agent = {
      id,
      name,
      description,
      type,
      role,
      skills: options.skills || [],
      inputs: options.inputs || { type: 'json', description: '' },
      outputs: options.outputs || { type: 'json', description: '' },
      parameters: options.parameters || {
        model: 'claude-opus-4-6',
        temperature: 0.7,
        max_tokens: 2000,
      },
      builtIn: false,
      usageCount: 0,
      history: [],
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    }

    // Сохрани конфиг
    const configPath = path.join(CONFIGS_DIR, `${id}.json`)
    fs.writeFileSync(configPath, JSON.stringify(agent, null, 2))

    // Сохрани промпт если передали
    if (options.roleFile) {
      const promptPath = path.join(PROMPTS_DIR, `${id}.md`)
      fs.writeFileSync(promptPath, role)
    }

    this.agents.set(id, agent)
    return agent
  }

  // Запусти агента
  async runAgent(agentId, input, options = {}) {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent "${agentId}" not found`)

    const run = {
      timestamp: new Date().toISOString(),
      status: 'running',
      inputSize: JSON.stringify(input).length,
      outputSize: 0,
      error: null,
    }

    agent.history = agent.history || []
    agent.history.push(run)
    agent.usageCount = (agent.usageCount || 0) + 1
    agent.lastUsedAt = new Date().toISOString()

    try {
      // Здесь будет реальный запуск Claude с промптом агента
      const result = await this._executeAgent(agent, input, options)
      run.status = 'success'
      run.outputSize = JSON.stringify(result).length
      run.result = result
      return result
    } catch (error) {
      run.status = 'error'
      run.error = error.message
      throw error
    } finally {
      this.saveAgentState(agentId)
    }
  }

  // Выполни агента (stub для реального выполнения)
  async _executeAgent(agent, input, options) {
    // Здесь будет логика вызова Claude API с промптом агента
    // Для теста вернём mock результат
    return {
      success: true,
      agent: agent.id,
      inputReceived: input,
      timestamp: new Date().toISOString(),
    }
  }

  // Сохрани состояние агента
  saveAgentState(agentId) {
    const agent = this.agents.get(agentId)
    if (!agent || agent.builtIn) return

    const configPath = path.join(CONFIGS_DIR, `${agentId}.json`)
    fs.writeFileSync(configPath, JSON.stringify(agent, null, 2))
  }

  // Получи агента
  getAgent(agentId) {
    return this.agents.get(agentId)
  }

  // Список всех агентов
  listAgents(filter = {}) {
    const agents = Array.from(this.agents.values())

    if (filter.type) {
      return agents.filter(a => a.type === filter.type)
    }
    if (filter.builtIn !== undefined) {
      return agents.filter(a => a.builtIn === filter.builtIn)
    }

    return agents
  }

  // История агента
  getHistory(agentId, limit = 10) {
    const agent = this.agents.get(agentId)
    if (!agent) return []

    return (agent.history || []).slice(-limit)
  }

  // Удали агента
  deleteAgent(agentId) {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent "${agentId}" not found`)
    if (agent.builtIn) throw new Error(`Cannot delete built-in agent "${agentId}"`)

    this.agents.delete(agentId)
    const configPath = path.join(CONFIGS_DIR, `${agentId}.json`)
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
  }

  // Обновить параметры агента
  updateAgent(agentId, updates) {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent "${agentId}" not found`)
    if (agent.builtIn) throw new Error(`Cannot update built-in agent "${agentId}"`)

    Object.assign(agent, updates)
    this.saveAgentState(agentId)
    return agent
  }

  // Статистика
  getStats() {
    const agents = Array.from(this.agents.values())
    return {
      totalAgents: agents.length,
      builtInAgents: agents.filter(a => a.builtIn).length,
      customAgents: agents.filter(a => !a.builtIn).length,
      totalRuns: agents.reduce((sum, a) => sum + (a.usageCount || 0), 0),
      mostUsed: agents.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0],
    }
  }
}

export default new AgentManager()
