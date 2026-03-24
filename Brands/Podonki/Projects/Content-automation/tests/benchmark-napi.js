/**
 * Benchmark: JS BM25 vs Rust Napi (native) vs Rust CLI
 */
import { BM25Search } from '../src/search/bm25-search.js'
import { NativeBm25 } from '../rust-napi/index.mjs'
import { BM25SearchRust } from '../src/search/bm25-rust-bridge.js'

const WORDS_RU = [
  'манго', 'арбуз', 'вкус', 'жидкость', 'вейп', 'кокос', 'банан',
  'тропический', 'микс', 'мятный', 'холодок', 'ледяной', 'клубника',
  'виноград', 'персик', 'лимон', 'апельсин', 'ваниль', 'карамель',
  'табак', 'ментол', 'малина', 'черника', 'ежевика', 'гуава',
  'маракуйя', 'дыня', 'груша', 'яблоко', 'вишня', 'слива',
  'подонки', 'бренд', 'новинка', 'топ', 'огонь', 'крутой', 'лучший',
  'под', 'одноразка', 'затяжка', 'никотин', 'солевой', 'жижа',
]

function randomDoc(id) {
  const wordCount = 10 + Math.floor(Math.random() * 40)
  const words = []
  for (let i = 0; i < wordCount; i++) {
    words.push(WORDS_RU[Math.floor(Math.random() * WORDS_RU.length)])
  }
  const daysAgo = Math.floor(Math.random() * 365)
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return { id: String(id), text: words.join(' '), date }
}

const SIZES = [100, 1_000, 5_000, 10_000]
const QUERIES = ['манго вкус', 'подонки топ', 'клубника ментол', 'арбуз лимон ваниль', 'под затяжка никотин']
const ITERATIONS = 3

console.log('=== BM25 Benchmark: JS vs Rust Napi vs Rust CLI ===\n')

for (const size of SIZES) {
  const docs = Array.from({ length: size }, (_, i) => randomDoc(i))
  console.log(`--- ${size.toLocaleString()} documents, ${QUERIES.length} queries × ${ITERATIONS} iterations ---`)

  // JS
  const jsSearch = new BM25Search()
  jsSearch.addDocuments(docs)
  const jsStart = performance.now()
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const q of QUERIES) jsSearch.search(q)
  }
  const jsTime = (performance.now() - jsStart) / ITERATIONS

  // Rust Napi (native)
  const napiSearch = new NativeBm25()
  napiSearch.addDocuments(docs)
  const napiStart = performance.now()
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const q of QUERIES) napiSearch.search(q)
  }
  const napiTime = (performance.now() - napiStart) / ITERATIONS

  // Rust CLI batch
  const cliSearch = new BM25SearchRust()
  cliSearch.addDocuments(docs)
  const cliStart = performance.now()
  cliSearch.searchBatch(QUERIES)
  const cliTime = performance.now() - cliStart

  const napiVsJs = jsTime / napiTime

  console.log(`  JS       : ${jsTime.toFixed(2)}ms  (${(jsTime / QUERIES.length).toFixed(3)}ms/query)`)
  console.log(`  Rust Napi: ${napiTime.toFixed(2)}ms  (${(napiTime / QUERIES.length).toFixed(3)}ms/query)`)
  console.log(`  Rust CLI : ${cliTime.toFixed(2)}ms  (process overhead)`)
  console.log(`  Napi vs JS: ${napiVsJs.toFixed(1)}x ${napiVsJs > 1 ? '🚀 Rust faster' : 'JS faster'}\n`)
}

// Correctness check
console.log('=== Correctness Check ===')
const testDocs = [
  { id: '1', text: 'манго арбуз вкус жидкость вейп' },
  { id: '2', text: 'кокос банан тропический микс' },
  { id: '3', text: 'мятный холодок ледяной вкус' },
]

const jsCheck = new BM25Search()
jsCheck.addDocuments(testDocs)
const jsResult = jsCheck.search('манго вкус')

const napiCheck = new NativeBm25()
napiCheck.addDocuments(testDocs)
const napiResult = napiCheck.search('манго вкус')

console.log(`  JS    top result: id=${jsResult[0].id}, score=${jsResult[0].score.toFixed(4)}`)
console.log(`  Napi  top result: id=${napiResult[0].id}, score=${napiResult[0].score.toFixed(4)}`)
console.log(`  Match: ${jsResult[0].id === napiResult[0].id ? '✅' : '❌'}`)
