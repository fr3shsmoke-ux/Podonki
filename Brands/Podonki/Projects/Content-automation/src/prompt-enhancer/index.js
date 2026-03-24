#!/usr/bin/env node

import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Загрузить .env — ищем в нескольких местах
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

import { input, select } from '@inquirer/prompts'
import { generateQuestions } from './question-generator.js'
import { askQuestions } from './interactive.js'
import { buildPrompt } from './prompt-builder.js'
import { loadProfile, saveProfile, listProfiles } from './profiles.js'
import { polishWithFabric } from './polish.js'
import clipboard from 'clipboardy'

const args = process.argv.slice(2)

async function main() {
  console.log('\nPrompt Enhancer\n')

  if (args.includes('--list-profiles')) {
    listProfiles()
    return
  }

  const profileIdx = args.indexOf('--profile')
  const saveIdx = args.indexOf('--save')
  const noPolish = args.includes('--no-polish')

  const profileName = profileIdx !== -1 ? args[profileIdx + 1] : null
  const saveName = saveIdx !== -1 ? args[saveIdx + 1] : null

  const flagArgs = new Set()
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      flagArgs.add(i)
      if (!args[i].includes('no-') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flagArgs.add(i + 1)
      }
    }
  }

  const promptParts = args.filter((_, i) => !flagArgs.has(i))

  let prompt = promptParts.join(' ')
  if (!prompt) {
    prompt = await input({
      message: 'Введи короткий промпт:',
    })
  }
  if (!prompt) return

  const profileAnswers = profileName ? loadProfile(profileName) : {}

  console.log('\nГенерирую вопросы...\n')
  const questions = await generateQuestions(prompt)
  console.log(`${questions.length} вопросов\n`)

  const mode = await select({
    message: 'Сколько вопросов?',
    choices: [
      { name: `Все ${questions.length}`, value: 'all' },
      { name: 'Только ключевые (5)', value: 'short' },
      { name: 'Пропустить', value: 'skip' }
    ]
  })

  let answers = {}
  if (mode !== 'skip') {
    const qs = mode === 'short' ? questions.slice(0, 5) : questions
    answers = await askQuestions(qs, profileAnswers)
  }

  console.log('\nСобираю расширенный промпт...\n')
  let enhanced = await buildPrompt(prompt, answers)

  if (!noPolish) {
    console.log('Полирую через Fabric...\n')
    enhanced = polishWithFabric(enhanced)
  }

  console.log('='.repeat(60))
  console.log('\nРАСШИРЕННЫЙ ПРОМПТ:\n')
  console.log(enhanced)
  console.log('\n' + '='.repeat(60))

  try {
    await clipboard.write(enhanced)
    console.log('\nСкопировано в буфер обмена!')
  } catch {
    console.log('\nНе удалось скопировать в буфер')
  }

  if (saveName) {
    saveProfile(saveName, answers)
  } else if (Object.keys(answers).length > 0) {
    const save = await select({
      message: 'Сохранить ответы как профиль?',
      choices: [
        { name: 'Нет', value: null },
        { name: 'Да', value: 'save' }
      ]
    })
    if (save === 'save') {
      const name = await input({ message: 'Имя профиля:' })
      if (name) saveProfile(name, answers)
    }
  }
}

main().catch(console.error)
