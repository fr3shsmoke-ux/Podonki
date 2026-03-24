import Anthropic from '@anthropic-ai/sdk'

let client

function getClient() {
  if (!client) client = new Anthropic()
  return client
}

export async function generateQuestions(prompt) {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Ты — эксперт по улучшению промптов. Пользователь написал короткий промпт:

"${prompt}"

Сгенерируй 8-15 уточняющих вопросов, которые помогут максимально расширить и улучшить этот промпт. Каждый вопрос должен раскрывать важный аспект задачи.

Верни JSON массив. Каждый элемент:
{
  "id": "unique_id",
  "text": "Текст вопроса (с эмодзи в начале)",
  "options": ["вариант1", "вариант2", ...],
  "multi": true/false,
  "category": "general|context|format|constraints|quality"
}

Правила:
- Вопросы на русском
- Варианты конкретные, не абстрактные
- Последний вариант всегда "Свой вариант"
- multi=true для вопросов где логично выбрать несколько (цели, фичи, платформы)
- Первые 3 вопроса — самые важные для понимания задачи
- Вопросы должны быть РЕЛЕВАНТНЫ конкретному промпту, не generic

Верни ТОЛЬКО JSON, без markdown.`
    }]
  })

  try {
    const text = response.content[0].text
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(text)
  } catch (e) {
    console.error('Ошибка парсинга вопросов:', e.message)
    return getFallbackQuestions()
  }
}

function getFallbackQuestions() {
  return [
    { id: 'goal', text: '🎯 Цель?', options: ['Для работы', 'Для обучения', 'Для проекта', 'Свой вариант'], multi: false, category: 'general' },
    { id: 'depth', text: '📊 Глубина?', options: ['Обзор', 'Средняя', 'Глубокая', 'Исчерпывающая', 'Свой вариант'], multi: false, category: 'format' },
    { id: 'format', text: '📋 Формат?', options: ['Таблица', 'Список', 'Подробный обзор', 'Markdown', 'Свой вариант'], multi: false, category: 'format' },
    { id: 'level', text: '🧠 Уровень?', options: ['Новичок', 'Средний', 'Продвинутый', 'Эксперт', 'Свой вариант'], multi: false, category: 'context' },
    { id: 'budget', text: '💰 Бюджет?', options: ['Бесплатные', 'До $20', 'До $50', 'Без ограничений', 'Свой вариант'], multi: false, category: 'constraints' }
  ]
}
