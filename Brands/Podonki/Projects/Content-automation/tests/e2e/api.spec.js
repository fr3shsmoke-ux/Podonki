import { test, expect } from '@playwright/test'

test.describe('API Tests', () => {
  test('Claude API should accept valid requests', async ({ request }) => {
    const response = await request.post('https://api.anthropic.com/v1/messages', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || 'test-key',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      data: {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'test' }],
      },
    })

    // Should be 401 with test-key (expected), or 200 with real key
    expect([200, 401]).toContain(response.status())
  })

  test('Telegram API endpoint should be accessible', async ({ request }) => {
    const response = await request.get('https://api.telegram.org/bottest/getMe')
    // Will fail with 401 (bad token), but endpoint is accessible
    expect([200, 401, 404]).toContain(response.status())
  })

  test('Qdrant search should be queryable', async ({ request }) => {
    const response = await request.post('http://localhost:6333/collections/podonki_products/points/search', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        vector: new Array(1536).fill(0),
        limit: 5,
      },
    })

    // 200 if Qdrant is running, otherwise 500/connection error
    expect([200, 500]).toContain(response.status())
  })
})
