#!/usr/bin/env node
/**
 * Настройка Qdrant: создание коллекции + загрузка продуктов
 * Запуск: node scripts/setup-qdrant.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const QDRANT_URL = 'http://localhost:6333'
const API_KEY = 'qdrant_local_key_2026'
const COLLECTION = 'podonki_products'
const VECTOR_SIZE = 384 // размер для простого текстового эмбеддинга

const headers = {
  'Content-Type': 'application/json',
  'api-key': API_KEY,
}

async function qdrant(endpoint, method = 'GET', body = null) {
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${QDRANT_URL}${endpoint}`, opts)
  return res.json()
}

/**
 * Простой текстовый эмбеддинг (детерминированный хеш)
 * В продакшене заменить на Ollama/OpenAI embeddings
 */
function textToVector(text, size = VECTOR_SIZE) {
  const vec = new Float32Array(size).fill(0)
  const lower = text.toLowerCase()

  // Char-level hashing с позиционным кодированием
  for (let i = 0; i < lower.length; i++) {
    const code = lower.charCodeAt(i)
    const pos = i % size
    vec[pos] += Math.sin(code * 0.1 + i * 0.01)
    vec[(pos + code) % size] += Math.cos(code * 0.05 + i * 0.02)
  }

  // Bigram features
  for (let i = 0; i < lower.length - 1; i++) {
    const bigram = lower.charCodeAt(i) * 256 + lower.charCodeAt(i + 1)
    vec[bigram % size] += 0.5
  }

  // Нормализация
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < size; i++) vec[i] /= norm
  }

  return Array.from(vec)
}

async function main() {
  console.log('🔧 Настройка Qdrant для Podonki\n')

  // 1. Проверка подключения
  try {
    const health = await qdrant('/collections')
    console.log(`✅ Qdrant доступен (${health.result.collections.length} коллекций)`)
  } catch {
    console.error('❌ Qdrant не отвечает на localhost:6333')
    console.error('   Запусти: D:\\AI\\qdrant\\start-qdrant.bat')
    process.exit(1)
  }

  // 2. Создание/пересоздание коллекции
  const existing = await qdrant(`/collections/${COLLECTION}`)
  if (existing.status === 'ok') {
    console.log(`⚠️  Коллекция ${COLLECTION} уже есть, пересоздаю...`)
    await qdrant(`/collections/${COLLECTION}`, 'DELETE')
  }

  const createResult = await qdrant('/collections/' + COLLECTION, 'PUT', {
    vectors: {
      size: VECTOR_SIZE,
      distance: 'Cosine',
    },
    optimizers_config: {
      indexing_threshold: 100,
    },
  })
  console.log(`✅ Коллекция создана: ${COLLECTION} (${VECTOR_SIZE}d, Cosine)`)

  // 3. Загрузка продуктов
  const productsPath = path.join(__dirname, '../data/products.json')
  const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'))
  const products = data.products || data

  console.log(`\n📦 Загрузка ${products.length} продуктов...\n`)

  const points = products.map((p, i) => {
    const searchText = [
      p.name,
      p.description,
      p.category,
      (p.flavor_types || []).join(' '),
      p.target_audience || '',
      p.usp || '',
      p.positioning || '',
    ].join(' ')

    return {
      id: i + 1,
      vector: textToVector(searchText),
      payload: {
        product_id: p.id,
        name: p.name,
        category: p.category,
        channel: p.channel,
        strength: p.strength,
        flavors_count: p.flavors_count,
        flavor_types: p.flavor_types,
        target_audience: p.target_audience,
        positioning: p.positioning,
        usp: p.usp,
        description: p.description,
      },
    }
  })

  // Загрузка батчем
  const upsertResult = await qdrant(`/collections/${COLLECTION}/points`, 'PUT', {
    points,
  })

  if (upsertResult.status === 'ok') {
    console.log(`✅ Загружено ${points.length} продуктов`)
  } else {
    console.error('❌ Ошибка загрузки:', upsertResult)
    process.exit(1)
  }

  // 4. Тестовый поиск
  console.log('\n🔍 Тестовый поиск: "крепкая жидкость с ягодным вкусом"')
  const testVector = textToVector('крепкая жидкость с ягодным вкусом')
  const searchResult = await qdrant(`/collections/${COLLECTION}/points/search`, 'POST', {
    vector: testVector,
    limit: 3,
    with_payload: true,
  })

  if (searchResult.result) {
    for (const hit of searchResult.result) {
      console.log(`  ${hit.score.toFixed(3)} | ${hit.payload.name} (${hit.payload.category}, ${hit.payload.strength})`)
    }
  }

  // 5. Тест 2
  console.log('\n🔍 Тестовый поиск: "табак конструктор легальный"')
  const testVector2 = textToVector('табак конструктор легальный')
  const searchResult2 = await qdrant(`/collections/${COLLECTION}/points/search`, 'POST', {
    vector: testVector2,
    limit: 3,
    with_payload: true,
  })

  if (searchResult2.result) {
    for (const hit of searchResult2.result) {
      console.log(`  ${hit.score.toFixed(3)} | ${hit.payload.name} (${hit.payload.category})`)
    }
  }

  // 6. Статистика
  const info = await qdrant(`/collections/${COLLECTION}`)
  const count = info.result?.points_count || 0
  console.log(`\n📊 Итого: ${count} точек в коллекции ${COLLECTION}`)
  console.log('✅ Qdrant настроен и готов к работе!\n')
}

main().catch(console.error)
