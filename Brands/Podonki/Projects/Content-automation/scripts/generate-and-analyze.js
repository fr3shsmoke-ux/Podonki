#!/usr/bin/env node
/**
 * Генерация + Анализ поста — полная цепочка
 * Использование:
 *   node scripts/generate-and-analyze.js [channel] [rubric] [product]
 *   node scripts/generate-and-analyze.js b2c b2c_flavor_test "Last Hap"
 *   node scripts/generate-and-analyze.js --batch b2c 5
 *   node scripts/generate-and-analyze.js --list [channel]
 */

import PostGeneratorV2 from '../src/generators/post-generator-v2.js'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)

async function main() {
  const generator = new PostGeneratorV2()

  // ── Список рубрик ──
  if (args[0] === '--list') {
    const channel = args[1]
    const rubrics = generator.listRubrics(channel)
    console.log(`\n📋 Рубрики${channel ? ` (${channel})` : ''}:\n`)
    for (const r of rubrics) {
      const prompt = r.hasPrompt ? '✅' : '❌'
      console.log(`  ${prompt} ${r.id} — ${r.name} (${r.channel}, вес: ${r.weight})`)
    }
    console.log(`\nВсего: ${rubrics.length}`)
    return
  }

  // ── Пакетная генерация ──
  if (args[0] === '--batch') {
    const channel = args[1] || 'b2c'
    const count = parseInt(args[2]) || 5
    const productQuery = args[3] || ''

    const results = await generator.generateBatch({ channel, count, productQuery })

    console.log('\n' + '='.repeat(60))
    console.log('  РЕЗУЛЬТАТЫ ПАКЕТНОЙ ГЕНЕРАЦИИ')
    console.log('='.repeat(60))

    const posts = []
    for (const [i, r] of results.entries()) {
      console.log(`\n── Пост ${i + 1} [${r.rubric}] ──`)
      console.log(r.post)
      posts.push({ channel: r.channel, text: r.post, rubric: r.rubric })
    }

    // Сохраняем для анализа
    const outputPath = path.join(__dirname, 'generated-posts.json')
    fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf-8')
    console.log(`\n💾 Сохранено: ${outputPath}`)

    // Запускаем анализатор
    runAnalyzer(posts)
    return
  }

  // ── Одиночная генерация ──
  const channel = args[0] || 'b2c'
  const rubricId = args[1] || ''
  const productQuery = args[2] || ''

  console.log(`\n🎯 Генерация: ${channel}${rubricId ? ` / ${rubricId}` : ''}${productQuery ? ` / ${productQuery}` : ''}\n`)

  const result = await generator.generatePost({ channel, rubricId, productQuery })

  if (!result.success) {
    console.error(`❌ Ошибка: ${result.error}`)
    process.exit(1)
  }

  console.log('── ПОСТ ──')
  console.log(result.post)
  console.log(`\n📊 Рубрика: ${result.rubric} | Модель: ${result.model} | Токены: ${result.tokens_used}`)

  // Анализируем
  const posts = [{ channel: result.channel, text: result.post, rubric: result.rubric }]
  runAnalyzer(posts)
}

function runAnalyzer(posts) {
  console.log('\n' + '='.repeat(60))
  console.log('  АНАЛИЗ ПОСТОВ')
  console.log('='.repeat(60))

  // Сохраняем во временный файл для Python-анализатора
  const tempPath = path.join(__dirname, 'posts-data.json')
  const formatted = posts.map(p => ({
    channel: p.channel || p.rubric || 'b2c',
    posts: [p.text],
  }))
  fs.writeFileSync(tempPath, JSON.stringify(formatted, null, 2), 'utf-8')

  try {
    const result = execSync('python scripts/analyze-posts.py', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    console.log(result)
  } catch (error) {
    console.error('⚠️  Анализатор не запустился:', error.message)
    // Inline fallback анализ
    for (const post of posts) {
      const text = post.text || ''
      const banned = ['инновационный', 'уникальный', 'революционный', 'передовой', 'не имеет аналогов']
      const found = banned.filter(w => text.toLowerCase().includes(w))
      if (found.length) {
        console.log(`  ❗ Корпоративные слова: ${found.join(', ')}`)
      } else {
        console.log('  ✅ Корпоративных слов нет')
      }
      console.log(`  📏 Длина: ${text.length} символов`)
      console.log(`  📝 Слов: ${text.split(/\s+/).length}`)
    }
  }
}

main().catch(console.error)
