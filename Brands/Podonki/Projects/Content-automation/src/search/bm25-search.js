/**
 * BM25+ search with temporal decay
 * Lightweight full-text search — no external dependencies
 */

const DEFAULT_K1 = 1.5
const DEFAULT_B = 0.75
const HALF_LIFE_DAYS = 30

/**
 * Tokenize text into searchable terms
 */
function tokenize(text) {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

/**
 * Calculate temporal decay factor
 * Half-life: 30 days — fresh content scores higher
 */
function temporalDecay(dateStr, halfLifeDays = HALF_LIFE_DAYS) {
  if (!dateStr) return 1
  const ageMs = Date.now() - new Date(dateStr).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return Math.pow(0.5, ageDays / halfLifeDays)
}

class BM25Search {
  constructor(options = {}) {
    this.k1 = options.k1 || DEFAULT_K1
    this.b = options.b || DEFAULT_B
    this.halfLifeDays = options.halfLifeDays || HALF_LIFE_DAYS
    this.documents = []
    this.index = new Map()
    this.avgDocLength = 0
  }

  /**
   * Index an array of documents
   * Each doc: { id, text, date?, ...metadata }
   */
  addDocuments(docs) {
    for (const doc of docs) {
      const tokens = tokenize(doc.text)
      const entry = {
        id: doc.id,
        tokens,
        length: tokens.length,
        date: doc.date || doc.created_at || doc.timestamp,
        meta: doc
      }
      this.documents.push(entry)

      const termFreq = new Map()
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1)
      }

      for (const [term, freq] of termFreq) {
        if (!this.index.has(term)) {
          this.index.set(term, [])
        }
        this.index.get(term).push({ docIdx: this.documents.length - 1, freq })
      }
    }

    this.avgDocLength = this.documents.length > 0
      ? this.documents.reduce((sum, d) => sum + d.length, 0) / this.documents.length
      : 0
  }

  /**
   * Search with BM25+ scoring and temporal decay
   * Returns top-N results sorted by relevance * freshness
   */
  search(query, limit = 5) {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const N = this.documents.length
    if (N === 0) return []

    const scores = new Float64Array(N)

    for (const term of queryTokens) {
      const postings = this.index.get(term)
      if (!postings) continue

      const df = postings.length
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

      for (const { docIdx, freq } of postings) {
        const doc = this.documents[docIdx]
        const tf = freq
        const docLen = doc.length

        // BM25+ formula (delta = 1 prevents zero scores for long docs)
        const numerator = tf * (this.k1 + 1)
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength))
        const bm25Score = idf * (numerator / denominator + 1)

        // Apply temporal decay
        const decay = temporalDecay(doc.date, this.halfLifeDays)
        scores[docIdx] += bm25Score * decay
      }
    }

    // Collect and sort results
    const results = []
    for (let i = 0; i < N; i++) {
      if (scores[i] > 0) {
        results.push({
          score: scores[i],
          ...this.documents[i].meta
        })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Clear index
   */
  clear() {
    this.documents = []
    this.index = new Map()
    this.avgDocLength = 0
  }

  get size() {
    return this.documents.length
  }
}

export { BM25Search, tokenize, temporalDecay }
export default BM25Search
