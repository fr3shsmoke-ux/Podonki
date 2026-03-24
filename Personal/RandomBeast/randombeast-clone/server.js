import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDB } from './src/db.js'
import { telegramRoutes } from './src/routes/telegram.js'
import { giveawayRoutes } from './src/routes/giveaway.js'
import { userRoutes } from './src/routes/user.js'
import { adminRoutes } from './src/routes/admin.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// Initialize database
await initDB()

// Routes
app.use('/api/telegram', telegramRoutes)
app.use('/api/giveaway', giveawayRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve index for SPA
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
