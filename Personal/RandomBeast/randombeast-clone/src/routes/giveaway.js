import express from 'express'
import { v4 as uuid } from 'uuid'
import { dbRun, dbGet, dbAll } from '../db.js'

export const giveawayRoutes = express.Router()

// Create giveaway
giveawayRoutes.post('/create', async (req, res) => {
  try {
    const {
      title,
      description,
      creator_id,
      prize_description,
      image_url,
      subscription_required,
      channel_id,
      max_participants
    } = req.body

    const giveawayId = uuid()
    const now = new Date().toISOString()

    await dbRun(
      `INSERT INTO giveaways (
        id, title, description, creator_id, prize_description,
        image_url, subscription_required, channel_id, max_participants, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        giveawayId,
        title,
        description,
        creator_id,
        prize_description,
        image_url,
        subscription_required ? 1 : 0,
        channel_id,
        max_participants
      ]
    )

    const giveaway = await dbGet(
      'SELECT * FROM giveaways WHERE id = ?',
      [giveawayId]
    )

    res.json({
      success: true,
      giveaway
    })
  } catch (error) {
    console.error('Create giveaway error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all active giveaways
giveawayRoutes.get('/active', async (req, res) => {
  try {
    const giveaways = await dbAll(`
      SELECT g.*,
             COUNT(p.id) as participant_count,
             u.first_name as creator_name
      FROM giveaways g
      LEFT JOIN participants p ON g.id = p.giveaway_id
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.status = 'active'
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `)

    res.json({ giveaways })
  } catch (error) {
    console.error('Get active giveaways error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get giveaway details
giveawayRoutes.get('/:giveawayId', async (req, res) => {
  try {
    const giveaway = await dbGet(
      'SELECT * FROM giveaways WHERE id = ?',
      [req.params.giveawayId]
    )

    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' })
    }

    const participants = await dbAll(
      'SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?',
      [giveaway.id]
    )

    res.json({
      ...giveaway,
      participants: participants[0].count
    })
  } catch (error) {
    console.error('Get giveaway error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Join giveaway
giveawayRoutes.post('/:giveawayId/join', async (req, res) => {
  try {
    const { giveawayId } = req.params
    const { userId, subscribed } = req.body

    const giveaway = await dbGet(
      'SELECT * FROM giveaways WHERE id = ?',
      [giveawayId]
    )

    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' })
    }

    if (giveaway.status !== 'active') {
      return res.status(400).json({ error: 'Giveaway is not active' })
    }

    // Check if already participated
    const existing = await dbGet(
      'SELECT * FROM participants WHERE giveaway_id = ? AND user_id = ?',
      [giveawayId, userId]
    )

    if (existing) {
      return res.status(400).json({ error: 'Already participated' })
    }

    // Check subscription requirement
    if (giveaway.subscription_required && !subscribed) {
      return res.status(400).json({ error: 'Must subscribe to channel' })
    }

    const participantId = uuid()
    await dbRun(
      `INSERT INTO participants (id, giveaway_id, user_id, subscribed)
       VALUES (?, ?, ?, ?)`,
      [participantId, giveawayId, userId, subscribed ? 1 : 0]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Join giveaway error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// End giveaway and select winner
giveawayRoutes.post('/:giveawayId/end', async (req, res) => {
  try {
    const { giveawayId } = req.params

    const giveaway = await dbGet(
      'SELECT * FROM giveaways WHERE id = ?',
      [giveawayId]
    )

    if (!giveaway) {
      return res.status(404).json({ error: 'Giveaway not found' })
    }

    // Get all participants
    const participants = await dbAll(
      'SELECT user_id FROM participants WHERE giveaway_id = ?',
      [giveawayId]
    )

    if (participants.length === 0) {
      return res.status(400).json({ error: 'No participants' })
    }

    // Select random winner
    const winner = participants[Math.floor(Math.random() * participants.length)]

    // Update giveaway
    await dbRun(
      'UPDATE giveaways SET status = ?, winner_id = ?, ended_at = ? WHERE id = ?',
      ['ended', winner.user_id, new Date().toISOString(), giveawayId]
    )

    res.json({
      success: true,
      winner_id: winner.user_id
    })
  } catch (error) {
    console.error('End giveaway error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
