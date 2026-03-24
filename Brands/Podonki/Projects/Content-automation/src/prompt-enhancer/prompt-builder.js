import Anthropic from '@anthropic-ai/sdk'

let client

function getClient() {
  if (!client) client = new Anthropic()
  return client
}

export async function buildPrompt(originalPrompt, answers) {
  const answersText = Object.entries(answers)
    .map(([id, val]) => `- ${id}: ${val}`)
    .join('\n')

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Ты — мастер промпт-инжиниринга. Возьми короткий промпт и ответы на уточняющие вопросы, и создай идеальный расширенный промпт.

Оригинальный промпт: "${originalPrompt}"

Ответы на вопросы:
${answersText}

Создай расширенный промпт который:
1. Включает ВСЮ информацию из ответов
2. Структурирован (разделы, списки)
3. Содержит чёткие критерии и ограничения
4. Указывает желаемый формат вывода
5. Максимально конкретный и однозначный
6. Написан так, чтобы AI выдал результат с первого раза

Верни ТОЛЬКО расширенный промпт, без пояснений и обёрток.`
    }]
  })

  return response.content[0].text
}
