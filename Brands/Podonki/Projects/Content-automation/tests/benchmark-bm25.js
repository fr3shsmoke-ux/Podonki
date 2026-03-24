/**
 * Benchmark: JS BM25 vs Rust BM25 (single + batch)
 */
import { BM25Search } from '../src/search/bm25-search.js'
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

console.log('=== BM25 Benchmark: JS vs Rust (single) vs Rust (batch) ===\n')

for (const size of SIZES) {
  const docs = Array.from({ length: size }, (_, i) => randomDoc(i))
  console.log(`--- ${size.toLocaleString()} documents, ${QUERIES.length} queries ---`)

  // JS
  const jsSearch = new BM25Search()
  jsSearch.addDocuments(docs)
  const jsStart = performance.now()
  for (const q of QUERIES) jsSearch.search(q)
  const jsTime = performance.now() - jsStart

  // Rust single (each query = new process)
  const rustSingle = new BM25SearchRust()
  rustSingle.addDocuments(docs)
  const rsSingleStart = performance.now()
  for (const q of QUERIES) rustSingle.search(q)
  const rsSingleTime = performance.now() - rsSingleStart

  // Rust batch (one process, all queries)
  const rustBatch = new BM25SearchRust()
  rustBatch.addDocuments(docs)
  const rsBatchStart = performance.now()
  rustBatch.searchBatch(QUERIES)
  const rsBatchTime = performance.now() - rsBatchStart

  console.log(`  JS         : ${jsTime.toFixed(1)}ms  (${(jsTime / QUERIES.length).toFixed(2)}ms/query)`)
  console.log(`  Rust single: ${rsSingleTime.toFixed(1)}ms  (${(rsSingleTime / QUERIES.length).toFixed(2)}ms/query)`)
  console.log(`  Rust batch : ${rsBatchTime.toFixed(1)}ms  (${(rsBatchTime / QUERIES.length).toFixed(2)}ms/query)`)
  console.log(`  Batch vs JS: ${(jsTime / rsBatchTime).toFixed(1)}x ${rsBatchTime < jsTime ? '🚀 Rust faster' : 'JS faster'}\n`)
}
