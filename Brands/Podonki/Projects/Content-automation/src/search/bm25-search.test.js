import { BM25Search, tokenize, temporalDecay } from './bm25-search.js'

describe('BM25Search', () => {
  let search

  beforeEach(() => {
    search = new BM25Search()
  })

  test('tokenize splits and lowercases text', () => {
    const tokens = tokenize('Hello World Test')
    expect(tokens).toEqual(['hello', 'world', 'test'])
  })

  test('tokenize filters short tokens', () => {
    const tokens = tokenize('I am a big cat')
    expect(tokens).toEqual(['am', 'big', 'cat'])
  })

  test('temporalDecay returns 1 for current date', () => {
    const decay = temporalDecay(new Date().toISOString())
    expect(decay).toBeGreaterThan(0.99)
  })

  test('temporalDecay returns ~0.5 for half-life age', () => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const decay = temporalDecay(date, 30)
    expect(decay).toBeCloseTo(0.5, 1)
  })

  test('search finds relevant documents', () => {
    search.addDocuments([
      { id: '1', text: 'манго арбуз вкус жидкость вейп' },
      { id: '2', text: 'кокос банан тропический микс' },
      { id: '3', text: 'мятный холодок ледяной вкус' },
    ])

    const results = search.search('манго вкус')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('1')
  })

  test('fresh documents score higher than old ones', () => {
    search.addDocuments([
      { id: 'old', text: 'манго арбуз вкус', date: '2025-01-01T00:00:00Z' },
      { id: 'new', text: 'манго арбуз вкус', date: new Date().toISOString() },
    ])

    const results = search.search('манго')
    expect(results[0].id).toBe('new')
  })

  test('empty query returns empty results', () => {
    search.addDocuments([{ id: '1', text: 'test' }])
    expect(search.search('')).toEqual([])
  })

  test('size returns document count', () => {
    search.addDocuments([
      { id: '1', text: 'one' },
      { id: '2', text: 'two' },
    ])
    expect(search.size).toBe(2)
  })

  test('clear resets index', () => {
    search.addDocuments([{ id: '1', text: 'test' }])
    search.clear()
    expect(search.size).toBe(0)
  })
})
