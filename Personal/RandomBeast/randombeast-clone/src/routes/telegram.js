import express from 'express'
import { v4 as uuid } from 'uuid'
import { dbRun, dbGet, dbAll } from '../db.js'
import crypto from 'crypto'

export const telegramRoutes = express.Router()

// Verify Telegram Web App data
function verifyTelegramData(initData) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!BOT_TOKEN) return false

  const data = new URLSearchParams(initData)
  const hash = data.get('hash')
  data.delete('hash')

  const dataCheckString = Array.from(data.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest()

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  return hash === calculatedHash
}

// Initialize user from Telegram
telegramRoutes.post('/init', async (req, res) => {
  try {
    const { initData } = req.body

    if (!verifyTelegramData(initData)) {
      return res.status(401).json({ error: 'Invalid Telegram data' })
    }

    const urlParams = new URLSearchParams(initData)
    const userStr = urlParams.get('user')
    const user = userStr ? JSON.parse(userStr) : null

    if (!user) {
      return res.status(400).json({ error: 'No user data' })
    }

    let dbUser = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [user.id]
    )

    if (!dbUser) {
      const userId = uuid()
      await dbRun(
        `INSERT INTO users (id, telegram_id, username, first_name, last_name, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          user.id,
          user.username || '',
          user.first_name || '',
          user.last_name || '',
          user.photo_url || ''
        ]
      )
      dbUser = await dbGet(
        'SELECT * FROM users WHERE telegram_id = ?',
        [user.id]
      )
    }

    res.json({
      success: true,
      user: dbUser
    })
  } catch (error) {
    console.error('Telegram init error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user profile
telegramRoutes.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT * FROM users WHERE telegram_id = ?',
      [req.params.telegramId]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const participations = await dbAll(
      'SELECT COUNT(*) as count FROM participants WHERE user_id = ?',
      [user.id]
    )

    const wins = await dbAll(
      'SELECT COUNT(*) as count FROM giveaways WHERE winner_id = ?',
      [user.id]
    )

    res.json({
      ...user,
      stats: {
        participations: participations[0].count,
        wins: wins[0].count
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
