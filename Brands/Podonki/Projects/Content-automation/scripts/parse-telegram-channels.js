#!/usr/bin/env node
/**
 * Парсер постов из Telegram-каналов через Bot API
 * Бот должен быть админом канала.
 *
 * Использование:
 *   node scripts/parse-telegram-channels.js                  # все каналы
 *   node scripts/parse-telegram-channels.js @podonki 50      # конкретный канал, 50 постов
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

// Каналы где бот — админ
const CHANNELS = [
  { id: '-1001662279308', name: 'PODONKI', type: 'b2c' },
  { id: '-1002308573929', name: 'Podonki OPT', type: 'train_lab' },
  { id: '-1002449378787', name: 'Train Lab', type: 'train_lab' },
]

async function tg(method, params = {}) {
  const url = new URL(`${API}/${method}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v)
  }
  const res = await fetch(url)
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Telegram API: ${data.description} (${data.error_code})`)
  }
  return data.result
}

/**
 * Получить историю сообщений через getUpdates + copyMessage trick
 * Bot API не даёт прямого доступа к истории, поэтому используем forwardMessages
 * Но есть workaround: copyMessage от message_id и декрементируем
 */
/**
 * Бинарный поиск последнего message_id через copyMessage
 * Учитывает пропуски (удалённые сообщения)
 */
async function findLastMessageId(channelId) {
  const adminId = process.env.TELEGRAM_ADMIN_ID

  async function msgExists(msgId) {
    try {
      const fwd = await tg('forwardMessage', {
        chat_id: adminId,
        from_chat_id: channelId,
        message_id: msgId,
      })
      try { await tg('deleteMessage', { chat_id: adminId, message_id: fwd.message_id }) } catch {}
      return true
    } catch {
      return false
    }
  }

  // Проверяем существование в области — хотя бы 1 из 5 соседних
  async function areaExists(msgId) {
    for (let offset = 0; offset < 5; offset++) {
      if (await msgExists(msgId + offset)) return true
      await new Promise(r => setTimeout(r, 80))
    }
    return false
  }

  console.log('  🔍 Ищу последний пост...')

  // Находим верхнюю границу (начинаем с 100, т.к. первые ID часто служебные)
  let lastFound = 0
  for (const probe of [100, 200, 500, 700, 1000, 2000, 5000, 10000, 20000]) {
    const exists = await msgExists(probe)
    if (exists) {
      lastFound = probe
      console.log(`    probe ${probe}: ✅`)
    } else {
      console.log(`    probe ${probe}: ❌`)
      // Не прерываем — могут быть пропуски, пробуем ещё
      if (lastFound > 0) break
    }
    await new Promise(r => setTimeout(r, 100))
  }

  if (!lastFound) return null

  // Бинарный поиск между lastFound и lastFound*2
  let low = lastFound
  let upper = Math.min(lastFound * 2, lastFound + 500)

  while (upper - low > 10) {
    const mid = Math.floor((low + upper) / 2)
    if (await areaExists(mid)) {
      low = mid
    } else {
      upper = mid
    }
    await new Promise(r => setTimeout(r, 80))
  }

  // Точный поиск — идём от upper вниз
  for (let i = upper + 5; i >= low; i--) {
    if (await msgExists(i)) return i
    await new Promise(r => setTimeout(r, 50))
  }

  return lastFound
}

async function getChannelPosts(channelId, limit = 100) {
  const posts = []

  // Сначала проверяем что бот имеет доступ
  try {
    const chat = await tg('getChat', { chat_id: channelId })
    console.log(`  ✅ ${chat.title} (${chat.type}, ${chat.id})`)
  } catch (err) {
    console.log(`  ❌ ${channelId}: ${err.message}`)
    return posts
  }

  // Определяем последний message_id бинарным поиском
  let lastMsgId = await findLastMessageId(channelId)
  if (!lastMsgId) {
    console.log('  ⚠️  Не удалось определить последний message_id')
    return posts
  }
  console.log(`  📊 Последний message_id: ~${lastMsgId}`)

  // Читаем посты от последнего к первому через copyMessage
  // copyMessage копирует пост — мы его копируем к себе (admin_id), читаем и удаляем
  const adminId = process.env.TELEGRAM_ADMIN_ID
  if (!adminId) {
    console.log('  ⚠️  TELEGRAM_ADMIN_ID не задан, пробую forwardMessage...')
  }

  let fetched = 0
  let errors = 0
  const maxErrors = 50 // допускаем пропуски (удалённые посты, медиа без текста)

  for (let msgId = lastMsgId; msgId > 0 && fetched < limit && errors < maxErrors; msgId--) {
    try {
      // forwardMessage пересылает в личку бота — оттуда читаем текст
      const forwarded = await tg('forwardMessage', {
        chat_id: adminId,
        from_chat_id: channelId,
        message_id: msgId,
      })

      const post = {
        message_id: msgId,
        date: forwarded.forward_date || forwarded.date,
        date_str: new Date((forwarded.forward_date || forwarded.date) * 1000).toISOString(),
        text: forwarded.text || '',
        caption: forwarded.caption || '',
        has_photo: !!forwarded.photo,
        has_video: !!forwarded.video,
        has_document: !!forwarded.document,
        entities: (forwarded.entities || forwarded.caption_entities || []).map(e => ({
          type: e.type, offset: e.offset, length: e.length,
        })),
      }

      // Удаляем пересланное из личного чата
      try {
        await tg('deleteMessage', { chat_id: adminId, message_id: forwarded.message_id })
      } catch {}

      const content = post.text || post.caption
      if (content) {
        posts.push(post)
        fetched++
        errors = 0
        if (fetched % 10 === 0) {
          console.log(`  📨 ${fetched}/${limit} постов...`)
        }
      } else {
        // Медиа без текста — не считаем ошибкой но пропускаем
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 120))

    } catch {
      errors++
    }
  }

  return posts
}

/**
 * Альтернативный метод: getUpdates (работает только для свежих постов)
 */
async function getRecentUpdates() {
  try {
    const updates = await tg('getUpdates', { limit: 100, offset: -100 })
    return updates.filter(u => u.channel_post).map(u => u.channel_post)
  } catch {
    return []
  }
}

async function main() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не найден в .env')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('  TELEGRAM CHANNEL PARSER (Bot API)')
  console.log('='.repeat(60))

  // Проверяем бота
  try {
    const me = await tg('getMe')
    console.log(`\n🤖 Бот: @${me.username} (${me.first_name})\n`)
  } catch (err) {
    console.error(`❌ Бот не отвечает: ${err.message}`)
    process.exit(1)
  }

  // Аргументы CLI
  const args = process.argv.slice(2)
  let targetChannels = CHANNELS
  let limit = 50

  if (args[0] && (args[0].startsWith('@') || args[0].startsWith('-'))) {
    targetChannels = CHANNELS.filter(c => c.id === args[0])
    if (!targetChannels.length) {
      targetChannels = [{ id: args[0], name: args[0], type: 'unknown' }]
    }
  }
  if (args[1]) limit = parseInt(args[1])

  console.log(`📋 Каналы: ${targetChannels.map(c => c.id).join(', ')}`)
  console.log(`📊 Лимит: ${limit} постов на канал\n`)

  const allResults = []

  for (const channel of targetChannels) {
    console.log(`\n📢 Парсинг: ${channel.name} (${channel.id})`)
    console.log('-'.repeat(40))

    const posts = await getChannelPosts(channel.id, limit)

    if (posts.length) {
      allResults.push({
        channel: channel.name,
        channel_id: channel.id,
        type: channel.type,
        posts_count: posts.length,
        posts: posts.map(p => ({
          id: p.message_id,
          date: p.date_str,
          text: p.text || p.caption,
          has_media: p.has_photo || p.has_video,
        })),
      })
      console.log(`  ✅ Получено ${posts.length} постов`)
    } else {
      console.log(`  ⚠️  0 постов`)
    }
  }

  // Сохранение
  if (allResults.length) {
    const outputPath = path.join(__dirname, 'parsed-telegram-posts.json')
    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf-8')
    console.log(`\n💾 Сохранено: ${outputPath}`)

    // Также в формате для анализатора
    const analyzerFormat = allResults.map(r => ({
      channel: r.channel,
      posts: r.posts.map(p => p.text).filter(Boolean),
    }))
    const analyzerPath = path.join(__dirname, 'posts-data.json')
    fs.writeFileSync(analyzerPath, JSON.stringify(analyzerFormat, null, 2), 'utf-8')
    console.log(`💾 Для анализатора: ${analyzerPath}`)

    // Статистика
    const totalPosts = allResults.reduce((s, r) => s + r.posts_count, 0)
    console.log(`\n📊 Итого: ${totalPosts} постов из ${allResults.length} каналов`)
  }
}

main().catch(console.error)
