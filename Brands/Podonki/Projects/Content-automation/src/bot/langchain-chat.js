import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(import.meta.dirname, '../../data')

// Загрузка базы знаний
const loadKnowledge = () => {
  const products = JSON.parse(readFileSync(join(DATA_DIR, 'products.json'), 'utf-8'))
  const knowledge = JSON.parse(readFileSync(join(DATA_DIR, 'vaping-knowledge.json'), 'utf-8'))
  return { products: products.products, knowledge: knowledge.knowledge_base }
}

// Память диалогов (userId -> история сообщений)
const conversations = new Map()
const MAX_HISTORY = 20

// Данные ЦА (собираем из разговоров)
const audienceDataPath = join(DATA_DIR, 'audience-profiles.json')

const loadAudienceData = () => {
  if (existsSync(audienceDataPath)) {
    return JSON.parse(readFileSync(audienceDataPath, 'utf-8'))
  }
  return { profiles: {}, stats: { total_conversations: 0, topics: {} } }
}

const saveAudienceData = (data) => {
  writeFileSync(audienceDataPath, JSON.stringify(data, null, 2), 'utf-8')
}

// Системный промпт для бота
const buildSystemPrompt = (products, knowledge) => {
  const productsList = products.map(p =>
    `- ${p.name}: ${p.category}, ${p.strength || 'гибкая'} крепость, ${p.flavors_count} вкусов. ${p.description.slice(0, 150)}...`
  ).join('\n')

  const knowledgeList = knowledge.map(k =>
    `[${k.topic}]: ${k.content}`
  ).join('\n\n')

  return `Ты — дружелюбный бот бренда Podonki в Telegram. Общаешься с аудиторией 16-25 лет.

## Стиль общения:
- Пишешь как друг в чате, не как робот
- Короткие предложения, без формальностей
- Можешь использовать сленг, иронию, эмодзи (умеренно)
- Никогда не говори "я ИИ" или "я бот" — ты представитель бренда
- Не рекламируй напрямую ("купи!"), упоминай продукты естественно
- Если не знаешь ответ — честно скажи и предложи спросить менеджера

## Задачи:
1. Отвечать на вопросы о вейпинге и продукции Podonki
2. Рекомендовать продукты по предпочтениям
3. Вести диалог, задавать вопросы аудитории
4. Собирать информацию о пользователях (возраст, предпочтения, город)

## Продукция Podonki:
${productsList}

## База знаний:
${knowledgeList}

## Важно:
- Продукция только для совершеннолетних (18+)
- Не преувеличивай безопасность вейпинга
- Если спрашивают о здоровье — отвечай аккуратно, не давай медицинских советов
- При вопросах о покупке/ценах — направляй к менеджеру или в магазин`
}

// Создание LLM
const createLLM = () => {
  return new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 500,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY
  })
}

// Получить или создать историю диалога
const getConversation = (userId) => {
  if (!conversations.has(userId)) {
    conversations.set(userId, [])
  }
  return conversations.get(userId)
}

// Анализ сообщения для сбора ЦА
const analyzeForAudience = (userId, userMessage, botResponse) => {
  const data = loadAudienceData()

  if (!data.profiles[userId]) {
    data.profiles[userId] = {
      first_seen: new Date().toISOString(),
      messages_count: 0,
      topics: [],
      preferences: {},
      info: {}
    }
  }

  const profile = data.profiles[userId]
  profile.messages_count++
  profile.last_seen = new Date().toISOString()

  // Определяем тему
  const topicPatterns = {
    'вкусы': /вкус|аромат|фрукт|ягод|мят|ментол|кисл/i,
    'крепость': /крепост|mg|миллиграм|сильн|лёгк|легк/i,
    'покупка': /куп|цен|стоит|заказ|доставк|магаз/i,
    'новичок': /начина|перв|нович|попробовать|посоветуй/i,
    'здоровье': /вред|здоров|безопас|опасн/i,
    'снюс': /снюс|пауч|slick/i,
    'никпаки': /никпак|пластинк|critical|original|mad/i,
    'конструктор': /конструктор|podgonki|сам собр/i,
    'коллаборации': /hotspot|isterika|malasian|arcade|коллаб/i
  }

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(userMessage)) {
      if (!profile.topics.includes(topic)) {
        profile.topics.push(topic)
      }
      data.stats.topics[topic] = (data.stats.topics[topic] || 0) + 1
    }
  }

  // Извлекаем возраст
  const ageMatch = userMessage.match(/мне\s+(\d{2})\s*(лет|год)/i)
  if (ageMatch) profile.info.age = parseInt(ageMatch[1])

  // Извлекаем город
  const cityPatterns = /из\s+(москв|питер|спб|екб|казан|новосиб|краснодар|нск|мск)/i
  const cityMatch = userMessage.match(cityPatterns)
  if (cityMatch) profile.info.city = cityMatch[1]

  data.stats.total_conversations++
  saveAudienceData(data)
}

// Основная функция чата
export const chat = async (userId, userMessage, userName = '') => {
  const { products, knowledge } = loadKnowledge()
  const llm = createLLM()
  const systemPrompt = buildSystemPrompt(products, knowledge)

  // Получаем историю
  const history = getConversation(userId)

  // Формируем сообщения
  const messages = [
    new SystemMessage(systemPrompt),
    ...history,
    new HumanMessage(userMessage)
  ]

  // Вызываем Claude
  const response = await llm.invoke(messages)
  const botResponse = response.content

  // Сохраняем в историю
  history.push(new HumanMessage(userMessage))
  history.push(new AIMessage(botResponse))

  // Ограничиваем историю
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2)
  }

  // Анализируем для ЦА
  analyzeForAudience(userId, userMessage, botResponse)

  return botResponse
}

// Функция для реакции на комментарий в канале
export const replyToComment = async (commentText, postContext = '') => {
  const { products, knowledge } = loadKnowledge()
  const llm = createLLM()

  const prompt = `Ты — представитель бренда Podonki. Ответь на комментарий к посту в канале.

Контекст поста: ${postContext}

Комментарий: ${commentText}

Правила:
- Отвечай коротко (1-3 предложения)
- Дружелюбно, но без лести
- Если хвалят — поблагодари кратко
- Если критикуют — признай и предложи решение
- Если спрашивают — ответь по делу
- Можешь задать встречный вопрос для вовлечения`

  const response = await llm.invoke([
    new SystemMessage(buildSystemPrompt(products, knowledge)),
    new HumanMessage(prompt)
  ])

  return response.content
}

// Получить статистику ЦА
export const getAudienceStats = () => {
  const data = loadAudienceData()
  const profiles = Object.values(data.profiles)

  return {
    total_users: profiles.length,
    total_conversations: data.stats.total_conversations,
    top_topics: Object.entries(data.stats.topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    active_users: profiles
      .filter(p => p.messages_count > 5)
      .length,
    avg_messages: profiles.length > 0
      ? Math.round(profiles.reduce((sum, p) => sum + p.messages_count, 0) / profiles.length)
      : 0,
    age_distribution: profiles
      .filter(p => p.info.age)
      .reduce((acc, p) => {
        const group = p.info.age < 18 ? '<18' : p.info.age < 21 ? '18-20' : p.info.age < 25 ? '21-24' : '25+'
        acc[group] = (acc[group] || 0) + 1
        return acc
      }, {})
  }
}

// Очистить историю пользователя
export const clearHistory = (userId) => {
  conversations.delete(userId)
}
