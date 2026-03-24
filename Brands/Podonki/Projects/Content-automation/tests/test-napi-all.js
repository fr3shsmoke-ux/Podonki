/**
 * Test all Napi functions
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const {
  NativeBm25,
  analyzeText,
  analyzePosts,
  parseTelegramHtml,
  jsonFilter,
  jsonGroupBy,
  csvToJson,
  jsonToCsv,
} = require('../rust-napi/index.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

console.log('=== Testing Napi Module ===\n')

console.log('--- BM25 Search ---')
test('basic search', () => {
  const search = new NativeBm25()
  search.addDocuments([
    { id: '1', text: 'манго арбуз вкус жидкость вейп' },
    { id: '2', text: 'кокос банан тропический микс' },
    { id: '3', text: 'мятный холодок ледяной вкус' },
  ])
  const results = search.search('манго вкус')
  assert(results.length > 0, 'No results')
  assert(results[0].id === '1', `Expected id=1, got ${results[0].id}`)
})

test('temporal decay', () => {
  const search = new NativeBm25()
  search.addDocuments([
    { id: 'old', text: 'манго арбуз вкус', date: '2025-01-01T00:00:00Z' },
    { id: 'new', text: 'манго арбуз вкус', date: new Date().toISOString() },
  ])
  const results = search.search('манго')
  assert(results[0].id === 'new', 'New doc should rank first')
})

test('empty query', () => {
  const search = new NativeBm25()
  search.addDocuments([{ id: '1', text: 'test' }])
  assert(search.search('').length === 0, 'Should return empty')
})

test('size and clear', () => {
  const search = new NativeBm25()
  search.addDocuments([{ id: '1', text: 'one' }, { id: '2', text: 'two' }])
  assert(search.size === 2, `Size should be 2, got ${search.size}`)
  search.clear()
  assert(search.size === 0, 'Should be 0 after clear')
})

console.log('\n--- Text Analysis ---')
test('analyzeText basic', () => {
  const result = analyzeText('Короче, это огонь! 🔥 Попробуй сам?\n\nНовая линейка.')
  assert(result.casualScore > 0, 'Should detect casual markers')
  assert(result.emojiCount > 0, 'Should detect emoji')
  assert(result.hasQuestion === true, 'Should detect question')
  assert(result.hasParagraphs === true, 'Should detect paragraphs')
})

test('analyzeText formal', () => {
  const result = analyzeText('Уважаемый клиент, данный продукт является инновационным.')
  assert(result.formalScore > 0, 'Should detect formal markers')
})

console.log('\n--- Deep Analysis (batch) ---')
test('analyzePosts batch', () => {
  const posts = [
    { id: '1', text: 'Короче, новый вкус манго — огонь! 🔥 Попробуй?\n\nЗалетай к менеджеру.', date: '2025-06-01T12:00:00Z', hasMedia: true },
    { id: '2', text: 'розыгрыш конкурс участвуй подпис', date: '2025-06-02T14:00:00Z', hasMedia: false },
    { id: '3', text: 'мем 😂', date: '2025-06-03T10:00:00Z', hasMedia: true },
  ]
  const report = analyzePosts(posts)
  assert(report.totalPosts === 3, `Expected 3 posts, got ${report.totalPosts}`)
  assert(report.posts.length === 3, 'Should have 3 analyzed posts')
  assert(report.posts[0].category.length > 0, `First post should have a category, got: ${report.posts[0].category}`)
  assert(report.posts[0].ctas.length > 0, 'First post should have CTAs')
  assert(report.avgLength > 0, 'Should have avg length')
  assert(report.busiestDay.length > 0, 'Should have busiest day')
})

console.log('\n--- HTML Parser ---')
test('parseTelegramHtml', () => {
  const html = `
    <div class="message default clearfix" id="message101">
      <div title="2025-01-15 14:30:00">
        <div class="text">Первый пост 🔥</div>
      </div>
    </div>
    <div class="message default clearfix" id="message102">
      <div title="2025-01-16 10:00:00">
        <div class="text">Второй пост <em>с тегами</em></div>
        <img src="photo.jpg">
      </div>
    </div>
  `
  const result = parseTelegramHtml(html)
  assert(result.totalPosts === 2, `Expected 2 posts, got ${result.totalPosts}`)
  assert(result.posts[0].id === 101, `Expected id=101, got ${result.posts[0].id}`)
  assert(result.posts[0].text.includes('Первый пост'), 'Should contain text')
  assert(result.posts[1].hasMedia === true, 'Second post should have media')
  assert(!result.posts[1].text.includes('<em>'), 'Should strip HTML tags')
})

console.log('\n--- JSON Processor ---')
test('jsonFilter', () => {
  const data = JSON.stringify([
    { name: 'Podgon', category: 'liquid' },
    { name: 'Slick', category: 'constructor' },
    { name: 'Last Hap', category: 'liquid' },
  ])
  const result = JSON.parse(jsonFilter(data, 'category', 'liquid'))
  assert(result.length === 2, `Expected 2 results, got ${result.length}`)
})

test('jsonGroupBy', () => {
  const data = JSON.stringify([
    { type: 'liquid' }, { type: 'liquid' }, { type: 'pod' }, { type: 'pod' }, { type: 'pod' },
  ])
  const result = jsonGroupBy(data, 'type')
  assert(result.length === 2, 'Should have 2 groups')
  assert(result[0][0] === 'pod' && result[0][1] === '3', 'Pod should be first with 3')
})

console.log('\n--- CSV Converter ---')
test('csvToJson', () => {
  const csv = 'ID,Name,Count\n1,Podgon,25\n2,Last Hap,40'
  const result = JSON.parse(csvToJson(csv))
  assert(result.length === 2, `Expected 2 rows, got ${result.length}`)
  assert(result[0].Name === 'Podgon', `Expected Podgon, got ${result[0].Name}`)
  assert(result[0].Count === 25, `Expected 25, got ${result[0].Count}`)
})

test('jsonToCsv', () => {
  const json = JSON.stringify([
    { ID: '1', Name: 'Podgon', Count: 25 },
    { ID: '2', Name: 'Last Hap', Count: 40 },
  ])
  const csv = jsonToCsv(json)
  assert(csv.includes('ID,Name,Count'), 'Should have headers')
  assert(csv.includes('Podgon'), 'Should have data')
  assert(csv.includes('40'), 'Should have numbers')
})

test('roundtrip CSV→JSON→CSV', () => {
  const original = 'A,B\nhello,42\nworld,99'
  const json = csvToJson(original)
  const backCsv = jsonToCsv(json)
  assert(backCsv.includes('hello'), 'Should preserve data in roundtrip')
  assert(backCsv.includes('99'), 'Should preserve numbers in roundtrip')
})

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
