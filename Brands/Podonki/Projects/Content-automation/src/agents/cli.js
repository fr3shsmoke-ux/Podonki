#!/usr/bin/env node

import AgentManager from './agent-manager.js'
import { AGENT_TYPES } from './agent-config.schema.js'
import fs from 'fs'

const manager = AgentManager

const commands = {
  list: () => {
    const agents = manager.listAgents()
    console.log('\n📋 Available Agents:\n')
    agents.forEach(agent => {
      const tag = agent.builtIn ? '✅ BUILT-IN' : '⚙️  CUSTOM'
      console.log(`  ${tag} ${agent.name}`)
      console.log(`     ID: ${agent.id}`)
      console.log(`     Type: ${agent.type}`)
      console.log(`     Uses: ${agent.usageCount} times`)
      console.log(`     Last used: ${agent.lastUsedAt || 'Never'}\n`)
    })
  },

  info: (agentId) => {
    const agent = manager.getAgent(agentId)
    if (!agent) {
      console.log(`❌ Agent "${agentId}" not found`)
      return
    }

    console.log(`\n📊 Agent: ${agent.name}\n`)
    console.log(`  ID: ${agent.id}`)
    console.log(`  Type: ${agent.type}`)
    console.log(`  Description: ${agent.description}`)
    console.log(`  Built-in: ${agent.builtIn ? 'Yes' : 'No'}`)
    console.log(`\n  Input: ${JSON.stringify(agent.inputs)}`)
    console.log(`  Output: ${JSON.stringify(agent.outputs)}`)
    console.log(`\n  Parameters:`)
    Object.entries(agent.parameters).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`)
    })
    console.log(`\n  Usage Count: ${agent.usageCount}`)
    console.log(`  Created: ${agent.createdAt}`)
    console.log(`  Last Used: ${agent.lastUsedAt || 'Never'}\n`)
  },

  create: (name, description, type) => {
    if (!name || !description || !type) {
      console.log('Usage: agent create <name> <description> <type>')
      console.log(`Types: ${Object.values(AGENT_TYPES).join(', ')}`)
      return
    }

    if (!Object.values(AGENT_TYPES).includes(type)) {
      console.log(`❌ Invalid type. Use: ${Object.values(AGENT_TYPES).join(', ')}`)
      return
    }

    try {
      const agent = manager.createAgent(name, description, type, '', {})
      console.log(`✅ Agent created: ${agent.id}`)
      console.log(`   Edit prompt at: src/agents/prompts/${agent.id}.md`)
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  },

  delete: (agentId) => {
    try {
      manager.deleteAgent(agentId)
      console.log(`✅ Agent "${agentId}" deleted`)
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  },

  history: (agentId, limit = 5) => {
    const history = manager.getHistory(agentId, limit)
    if (history.length === 0) {
      console.log(`No history for "${agentId}"`)
      return
    }

    console.log(`\n📜 History for ${agentId} (last ${limit}):\n`)
    history.forEach((run, i) => {
      const status = run.status === 'success' ? '✅' : '❌'
      console.log(`  ${i + 1}. ${status} ${run.timestamp}`)
      console.log(`     Status: ${run.status}`)
      if (run.error) console.log(`     Error: ${run.error}`)
      console.log(`     Input size: ${run.inputSize} bytes`)
      console.log(`     Output size: ${run.outputSize} bytes\n`)
    })
  },

  stats: () => {
    const stats = manager.getStats()
    console.log('\n📈 Agent Statistics:\n')
    console.log(`  Total Agents: ${stats.totalAgents}`)
    console.log(`  Built-in: ${stats.builtInAgents}`)
    console.log(`  Custom: ${stats.customAgents}`)
    console.log(`  Total Runs: ${stats.totalRuns}`)
    if (stats.mostUsed) {
      console.log(`  Most Used: ${stats.mostUsed.name} (${stats.mostUsed.usageCount} times)\n`)
    }
  },

  types: () => {
    console.log('\n🏷️  Agent Types:\n')
    Object.entries(AGENT_TYPES).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    console.log()
  },

  help: () => {
    console.log(`
Agent Manager CLI

Commands:
  agent list                          List all agents
  agent info <agent-id>               Show agent details
  agent create <name> <desc> <type>  Create new agent
  agent delete <agent-id>             Delete custom agent
  agent history <agent-id> [limit]   Show agent run history
  agent stats                         Show statistics
  agent types                         List agent types
  agent help                          Show this help

Examples:
  agent list
  agent info telegram-parser
  agent create "VK Parser" "Parse VK posts" parser
  agent history post-generator 10
  agent stats
`)
  },
}

// Parse arguments
const [, , command, ...args] = process.argv

if (!command || command === 'help') {
  commands.help()
} else if (commands[command]) {
  commands[command](...args)
} else {
  console.log(`Unknown command: ${command}`)
  console.log('Use "agent help" for available commands')
}
