// Главный входной файл агентов
// Используй этот файл для быстрого доступа ко всем функциям

export { default as AgentManager } from './agent-manager.js'
export { autoRunAgent, selectAgent, executeAgent, parallelRunAgents } from './agent-executor.js'
export { createAgentForTask, suggestAgent } from './agent-creator.js'
export { AGENT_TYPES, BUILT_IN_AGENTS } from './agent-config.schema.js'

// Быстрый старт:
// import { autoRunAgent, createAgentForTask } from './agents/index.js'
//
// // Запусти существующий агент
// await autoRunAgent("Сгенери пост о новом вкусе земляничка")
//
// // Создай новый агент для новой задачи
// await createAgentForTask("Ты специалист по анализу TikTok трендов...")
