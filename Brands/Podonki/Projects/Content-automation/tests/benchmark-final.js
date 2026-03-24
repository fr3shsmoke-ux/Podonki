/**
 * Final benchmark: all modules — JS vs Rust Napi vs Rust CLI
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { BM25Search } from '../src/search/bm25-search.js'

const require = createRequire(import.meta.url)
const { NativeBm25, analyzePosts, csvToJson, jsonToCsv, jsonGroupBy, parseTelegramHtml } = require('../rust-napi/index.js')

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║        FINAL BENCHMARK: JS vs Rust Napi vs Rust CLI        ║')
console.log('╚══════════════════════════════════════════════════════════════╝\n')

// Load real data
const postsRaw = readFileSync('scripts/parsed-telegram-posts.json', 'utf-8')
const postsData = JSON.parse(postsRaw)
const posts = postsData[0].posts
const csvData = readFileSync('podonki-products.csv', 'utf-8')
const productsJson = readFileSync('data/products.json', 'utf-8')

function bench(name, fn, iterations = 10) {
  // Warmup
  fn()
  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = (performance.now() - start) / iterations
  return elapsed
}

// ── 1. BM25 Search ──
console.log('═══ 1. BM25 SEARCH (5000 docs, 5 queries) ═══')
const WORDS = ['манго', 'арбуз', 'вкус', 'вейп', 'кокос', 'банан', 'мятный', 'подонки', 'топ', 'никотин']
const docs5k = Array.from({ length: 5000 }, (_, i) => {
  const words = Array.from({ length: 20 }, () => WORDS[Math.floor(Math.random() * WORDS.length)])
  return { id: String(i), text: words.join(' '), date: new Date().toISOString() }
})
const queries = ['манго вкус', 'подонки топ', 'кокос банан', 'арбуз мятный', 'никотин вейп']

const jsSearchTime = bench('JS BM25', () => {
  const s = new BM25Search()
  s.addDocuments(docs5k)
  for (const q of queries) s.search(q)
})

const napiSearchTime = bench('Napi BM25', () => {
  const s = new NativeBm25()
  s.addDocuments(docs5k)
  for (const q of queries) s.search(q)
})

console.log(`  JS     : ${jsSearchTime.toFixed(2)}ms`)
console.log(`  Napi   : ${napiSearchTime.toFixed(2)}ms`)
console.log(`  Speedup: ${(jsSearchTime / napiSearchTime).toFixed(1)}x 🚀\n`)

// ── 2. Deep Analysis ──
console.log('═══ 2. DEEP ANALYSIS (418 real posts) ═══')
const napiPosts = posts.map(p => ({
  id: String(p.id),
  text: p.text,
  date: p.date,
  hasMedia: p.has_media,
}))

const napiAnalysisTime = bench('Napi analyze', () => {
  analyzePosts(napiPosts)
}, 50)

const cliAnalysisStart = performance.now()
execFileSync('python', ['scripts/deep-analysis.py'], { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' })
const cliPythonTime = performance.now() - cliAnalysisStart

const cliRustStart = performance.now()
execFileSync('./rust-tools/target/release/deep-analysis.exe', ['--input', 'scripts/parsed-telegram-posts.json', '--output', '/tmp/bench-out.json'], { encoding: 'utf-8', stdio: 'pipe' })
const cliRustTime = performance.now() - cliRustStart

console.log(`  Python CLI : ${cliPythonTime.toFixed(1)}ms`)
console.log(`  Rust CLI   : ${cliRustTime.toFixed(1)}ms  (${(cliPythonTime / cliRustTime).toFixed(0)}x vs Python)`)
console.log(`  Rust Napi  : ${napiAnalysisTime.toFixed(2)}ms  (${(cliPythonTime / napiAnalysisTime).toFixed(0)}x vs Python)`)
console.log(`  Napi vs CLI: ${(cliRustTime / napiAnalysisTime).toFixed(1)}x faster (no process overhead)\n`)

// ── 3. CSV Conversion ──
console.log('═══ 3. CSV↔JSON CONVERSION (20 products) ═══')
const napiCsvTime = bench('Napi csvToJson', () => {
  csvToJson(csvData)
}, 100)

const napiJsonToCsvTime = bench('Napi jsonToCsv', () => {
  jsonToCsv(JSON.stringify(JSON.parse(productsJson).products))
}, 100)

console.log(`  csvToJson  : ${napiCsvTime.toFixed(3)}ms`)
console.log(`  jsonToCsv  : ${napiJsonToCsvTime.toFixed(3)}ms\n`)

// ── 4. JSON GroupBy ──
console.log('═══ 4. JSON GROUP-BY (20 products) ═══')
const napiGroupTime = bench('Napi groupBy', () => {
  jsonGroupBy(JSON.stringify(JSON.parse(productsJson).products), 'category')
}, 100)
console.log(`  groupBy    : ${napiGroupTime.toFixed(3)}ms\n`)

// ── 5. Summary ──
console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║                        SUMMARY                             ║')
console.log('╠══════════════════════════════════════════════════════════════╣')
console.log(`║  BM25 Search (5K docs)  : ${(jsSearchTime / napiSearchTime).toFixed(1)}x faster via Napi`.padEnd(62) + '║')
console.log(`║  Deep Analysis (418 posts): ${(cliPythonTime / napiAnalysisTime).toFixed(0)}x faster vs Python`.padEnd(62) + '║')
console.log(`║  Process overhead saved : ${(cliRustTime / napiAnalysisTime).toFixed(1)}x (CLI → Napi)`.padEnd(62) + '║')
console.log(`║  Static binaries        : 5 standalone .exe (no runtime)`.padEnd(62) + '║')
console.log(`║  Napi module            : 1 .node file, 13 functions`.padEnd(62) + '║')
console.log('╚══════════════════════════════════════════════════════════════╝')
