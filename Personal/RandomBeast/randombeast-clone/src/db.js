import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const db = new sqlite3.Database(':memory:')

const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

export async function initDB() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      image_url TEXT,
      prize_description TEXT,
      subscription_required BOOLEAN DEFAULT 0,
      channel_id TEXT,
      max_participants INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      winner_id TEXT,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      subscribed BOOLEAN DEFAULT 0,
      participated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(giveaway_id, user_id)
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      giveaway_id TEXT,
      type TEXT,
      message TEXT,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
    )
  `)

  console.log('Database initialized')
}

export { db, dbRun, dbGet, dbAll }
