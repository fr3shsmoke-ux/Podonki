import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { NativeBm25, analyzeText } = require('./index.js')
export { NativeBm25, analyzeText }
