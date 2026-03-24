import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { chat, replyToComment, getAudienceStats, clearHistory } from './langchain-chat.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN не задан в .env')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// /start
bot.start((ctx) => {
  ctx.reply('Привет! 👋 Я бот Podonki.\n\nМогу помочь:\n• Подобрать жижу/снюс/никпаки\n• Ответить на вопросы о вейпинге\n• Рассказать о продукции\n\nПросто напиши что интересует!')
})

// /help
bot.help((ctx) => {
  ctx.reply('Что умею:\n\n/recommend — подобрать продукт\n/flavors — показать вкусы\n/stats — статистика (для админа)\n/clear — очистить историю диалога\n\nИли просто пиши — я отвечу на любой вопрос о вейпинге 💨')
})

// /recommend
bot.command('recommend', async (ctx) => {
  const response = await chat(
    ctx.from.id,
    'Помоги подобрать продукт. Спроси что мне нравится — вкусы, крепость, формат (жижа, снюс, никпаки).',
    ctx.from.first_name
  )
  ctx.reply(response)
})

// /flavors
bot.command('flavors', async (ctx) => {
  const response = await chat(
    ctx.from.id,
    'Какие вкусы есть у Podonki? Расскажи кратко по линейкам.',
    ctx.from.first_name
  )
  ctx.reply(response)
})

// /stats — только для админа
bot.command('stats', (ctx) => {
  if (ADMIN_ID && ctx.from.id.toString() !== ADMIN_ID) {
    return ctx.reply('Только для админа')
  }

  const stats = getAudienceStats()
  const topTopics = stats.top_topics
    .map(([topic, count]) => `  ${topic}: ${count}`)
    .join('\n')

  const ages = Object.entries(stats.age_distribution)
    .map(([group, count]) => `  ${group}: ${count}`)
    .join('\n')

  ctx.reply(
    `📊 Статистика ЦА:\n\n` +
    `Пользователей: ${stats.total_users}\n` +
    `Диалогов: ${stats.total_conversations}\n` +
    `Активных (5+ сообщений): ${stats.active_users}\n` +
    `Среднее сообщений: ${stats.avg_messages}\n\n` +
    `🔥 Популярные темы:\n${topTopics || '  пока нет данных'}\n\n` +
    `👥 Возраст:\n${ages || '  пока нет данных'}`
  )
})

// /clear
bot.command('clear', (ctx) => {
  clearHistory(ctx.from.id)
  ctx.reply('История очищена. Начинаем заново!')
})

// Обработка всех текстовых сообщений
bot.on('text', async (ctx) => {
  // Пропускаем команды
  if (ctx.message.text.startsWith('/')) return

  // Пропускаем сообщения от самого бота
  if (ctx.from.is_bot) return

  try {
    let response

    // Если это группа/канал — реагируем как на комментарий
    if (ctx.chat.type === 'supergroup' || ctx.chat.type === 'group') {
      response = await replyToComment(ctx.message.text)
      await ctx.reply(response, { reply_to_message_id: ctx.message.message_id })
    } else {
      // Если это ЛС — обычный чат с памятью
      response = await chat(
        ctx.from.id,
        ctx.message.text,
        ctx.from.first_name
      )

      // Разбиваем длинные ответы
      if (response.length > 4000) {
        const parts = response.match(/.{1,4000}/gs)
        for (const part of parts) {
          await ctx.reply(part)
        }
      } else {
        await ctx.reply(response)
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
    ctx.reply('Упс, что-то пошло не так. Попробуй ещё раз через пару секунд 🙏')
  }
})

// Запуск
bot.launch()
console.log('🤖 Podonki Bot запущен!')
console.log('Нажми Ctrl+C для остановки')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
