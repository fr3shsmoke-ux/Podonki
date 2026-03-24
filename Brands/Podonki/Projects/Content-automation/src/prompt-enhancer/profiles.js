import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

const PROFILES_DIR = join(process.env.USERPROFILE || process.env.HOME, '.prompt-enhancer', 'profiles')

function ensureDir() {
  if (!existsSync(PROFILES_DIR)) {
    mkdirSync(PROFILES_DIR, { recursive: true })
  }
}

export function saveProfile(name, answers) {
  ensureDir()
  const file = join(PROFILES_DIR, `${name}.json`)
  writeFileSync(file, JSON.stringify(answers, null, 2))
  console.log(`Профиль "${name}" сохранён`)
}

export function loadProfile(name) {
  const file = join(PROFILES_DIR, `${name}.json`)
  if (!existsSync(file)) {
    console.log(`Профиль "${name}" не найден`)
    return {}
  }
  return JSON.parse(readFileSync(file, 'utf-8'))
}

export function listProfiles() {
  ensureDir()
  const files = readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('Профилей нет')
    return []
  }
  console.log('Профили:')
  files.forEach(f => console.log(`  - ${f.replace('.json', '')}`))
  return files.map(f => f.replace('.json', ''))
}
