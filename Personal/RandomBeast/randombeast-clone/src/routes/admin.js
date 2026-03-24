import express from 'express'
import { dbAll, dbRun, dbGet } from '../db.js'

export const adminRoutes = express.Router()

// Middleware to verify admin
function verifyAdmin(req, res, next) {
  const adminToken = req.headers.authorization?.replace('Bearer ', '')
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Get dashboard stats
adminRoutes.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await dbGet(
      'SELECT COUNT(*) as count FROM users'
    )
    const totalGiveaways = await dbGet(
      'SELECT COUNT(*) as count FROM giveaways'
    )
    const totalParticipations = await dbGet(
      'SELECT COUNT(*) as count FROM participants'
    )
    const activeGiveaways = await dbGet(
      "SELECT COUNT(*) as count FROM giveaways WHERE status = 'active'"
    )

    res.json({
      totalUsers: totalUsers.count,
      totalGiveaways: totalGiveaways.count,
      totalParticipations: totalParticipations.count,
      activeGiveaways: activeGiveaways.count
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all giveaways
adminRoutes.get('/giveaways', verifyAdmin, async (req, res) => {
  try {
    const giveaways = await dbAll(`
      SELECT g.*,
             COUNT(p.id) as participants,
             u.first_name as creator_name
      FROM giveaways g
      LEFT JOIN participants p ON g.id = p.giveaway_id
      LEFT JOIN users u ON g.creator_id = u.id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `)

    res.json({ giveaways })
  } catch (error) {
    console.error('Get giveaways error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove inappropriate giveaway
adminRoutes.delete('/giveaways/:giveawayId', verifyAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM giveaways WHERE id = ?', [req.params.giveawayId])
    res.json({ success: true })
  } catch (error) {
    console.error('Delete giveaway error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Ban user
adminRoutes.post('/users/:userId/ban', verifyAdmin, async (req, res) => {
  try {
    // TODO: Add banned_at or status field to users table
    res.json({ success: true })
  } catch (error) {
    console.error('Ban user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
