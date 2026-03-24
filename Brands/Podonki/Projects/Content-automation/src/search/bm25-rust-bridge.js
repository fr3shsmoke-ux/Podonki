/**
 * Node.js bridge to Rust BM25 search CLI
 * Uses single process call with batch queries for efficiency
 */
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RUST_BIN = join(__dirname, '../../rust-tools/target/release/bm25-search.exe')

class BM25SearchRust {
  constructor(options = {}) {
    this.k1 = options.k1 || 1.5
    this.b = options.b || 0.75
    this.halfLifeDays = options.halfLifeDays || 30
    this.documents = []
  }

  addDocuments(docs) {
    this.documents.push(...docs)
  }

  /**
   * Single query — calls Rust CLI once
   * Best for: one-off searches or when documents change between queries
   */
  search(query, limit = 5) {
    if (!query || this.documents.length === 0) return []

    const input = JSON.stringify(this.documents)
    const args = [
      '--query', query,
      '--limit', String(limit),
      '--k1', String(this.k1),
      '--b', String(this.b),
      '--half-life', String(this.halfLifeDays),
    ]

    const result = execFileSync(RUST_BIN, args, {
      input,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    })

    return JSON.parse(result)
  }

  /**
   * Batch search — one Rust process, many queries
   * Significantly faster than calling search() in a loop
   */
  searchBatch(queries, limit = 5) {
    if (this.documents.length === 0) return queries.map(() => [])

    const batchInput = JSON.stringify({
      documents: this.documents,
      queries: queries.map(q => ({ query: q, limit })),
      k1: this.k1,
      b: this.b,
      half_life: this.halfLifeDays,
    })

    const result = execFileSync(RUST_BIN, ['--batch'], {
      input: batchInput,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    })

    return JSON.parse(result)
  }

  clear() {
    this.documents = []
  }

  get size() {
    return this.documents.length
  }
}

export { BM25SearchRust }
export default BM25SearchRust
