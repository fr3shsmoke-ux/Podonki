import express from 'express'
import { dbGet, dbAll } from '../db.js'

export const userRoutes = express.Router()

// Get user's giveaways
userRoutes.get('/:userId/giveaways', async (req, res) => {
  try {
    const giveaways = await dbAll(
      `SELECT g.*, COUNT(p.id) as participants
       FROM giveaways g
       LEFT JOIN participants p ON g.id = p.giveaway_id
       WHERE g.creator_id = ?
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.params.userId]
    )

    res.json({ giveaways })
  } catch (error) {
    console.error('Get user giveaways error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's participations
userRoutes.get('/:userId/participations', async (req, res) => {
  try {
    const participations = await dbAll(
      `SELECT g.*,
              p.participated_at,
              p.subscribed,
              (g.winner_id = ?) as won
       FROM participants p
       JOIN giveaways g ON p.giveaway_id = g.id
       WHERE p.user_id = ?
       ORDER BY p.participated_at DESC`,
      [req.params.userId, req.params.userId]
    )

    res.json({ participations })
  } catch (error) {
    console.error('Get participations error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user notifications
userRoutes.get('/:userId/notifications', async (req, res) => {
  try {
    const notifications = await dbAll(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.userId]
    )

    res.json({ notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark notification as read
userRoutes.post('/notifications/:notificationId/read', async (req, res) => {
  try {
    // TODO: Implement marking notification as read
    res.json({ success: true })
  } catch (error) {
    console.error('Mark notification error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
