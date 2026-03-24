import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Anthropic } from '@anthropic-ai/sdk'
import BM25Search from '../search/bm25-search.js'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const QDRANT_URL = 'http://localhost:6333'
const QDRANT_API_KEY = 'qdrant_local_key_2026'
const COLLECTION_NAME = 'podonki_products'
const VECTOR_SIZE = 384

// ════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS из SYSTEM_PROMPTS_FINAL.md (на основе 192 реальных постов)
// ════════════════════════════════════════════════════════════════════

const GLOBAL_RULES = `ГЛОБАЛЬНЫЕ ПРАВИЛА (обязательны для ВСЕХ постов):

Язык и стиль:
- Прямой, без лишних слов (экономь мысли, говори по делу)
- Короткие предложения (1-2 строки максимум)
- Разговорная лексика: офигеть, зашло, норм, вкусно, качественно
- НЕ ИСПОЛЬЗУЙ слова: инновационный, революционный, уникальный, передовой, в данном контексте, высочайший, не имеет аналогов, широкий ассортимент, эксклюзивный
- НЕ ИСПОЛЬЗУЙ бессмысленные прилагательные без контекста

Структура поста:
[Название товара / статус]
[Главное преимущество в 1-2 строки]
[Детали: характеристики, вкусы, ЦА]
[CTA: как купить / связаться]
[Подпись бренда]

Emoji:
- 💀 — смерть чёрному рынку, уверенность (только OFF)
- ➖ — маркер списка (3+ пунктов)
- 🔥 — качество, мощь
- ✅ — готово, подтверждение
- 🧪 — TRAIN LAB, научный подход
- ⚡️ — энергия, новизна

CAPS:
- PODONKI — название бренда (всегда)
- TRAIN LAB / SKULL — названия каналов
- Остальное lowercase, кроме имён товаров`

const SYSTEM_PROMPTS = {
  // ── TRAIN LAB (B2B) ──
  train_lab_product_announcement: `Ты пишешь пост про товар Podonki для владельцев/закупщиков вейпшопов.

Структура ОБЯЗАТЕЛЬНАЯ:
1. Название товара + линейка (например: "Last Hap: 50мг, 40 вкусов")
2. Фокус на партнёра: "почему ЭТО хорошо для твоего магазина"
3. Характеристики (крепость, вкусы, ЦА конечного потребителя)
4. Бизнес-перспектива: маржа, быстрый оборот, лояльность клиентов
5. Практический совет: как расположить в магазине, что рекомендовать

Тон: Совет, поддержка, дружелюбно, БЕЗ навязчивости.
Язык: "берёшь", "вкус держится", "партнёры выбирают", "норм маржа"
Контакт: @TRAIN_LAB_manager`,

  train_lab_comparison: `Ты пишешь сравнение 2-3 товаров для владельца магазина вейпа.

Фокус: "Какой товар выбрать в ЭТОЙ ситуации?"

Структура:
1. Сценарий / проблема ("У тебя молодые клиенты / пожилые?")
2. Товар A: характеристики + кто выбирает
3. Товар B: характеристики + кто выбирает
4. Чем отличаются (крепость, вкусы, дизайн, оборот)
5. Совет: как комбинировать в магазине

Тон: Объективное сравнение, без давления. "Смотри, разница вот здесь".
Контакт: @TRAIN_LAB_manager`,

  train_lab_retail_solution: `Ты пишешь пост, который решает конкретную проблему магазина.

Структура:
1. Проблема магазина (конкретная, узнаваемая)
2. Почему это проблема (потеря клиентов, маржи)
3. Решение через товар PODONKI
4. Практические шаги (что сделать прямо сейчас)
5. Результат (что получишь)

Тон: "Я знаю эту проблему, вот решение". Уверенно, без кликбейта.
Контакт: @TRAIN_LAB_manager`,

  train_lab_characteristics: `Ты пишешь образовательный пост о характеристиках товара для продавцов.

Цель: чтобы продавец в магазине мог объяснить клиенту.

Структура:
1. Что это за товар (1 строка)
2. Ключевые характеристики (список)
3. Чем отличается от аналогов
4. Как объяснить клиенту (простыми словами)
5. Частые вопросы и ответы

Тон: Обучающий, но не занудный. "Вот что нужно знать".
Контакт: @TRAIN_LAB_manager`,

  train_lab_brand: `Ты пишешь пост об укреплении доверия к бренду PODONKI.

Структура:
1. Факт/достижение бренда
2. Что это значит для партнёра
3. Поддержка (что мы делаем для партнёров)
4. CTA

Тон: Уверенный, но не хвастливый. Факты > обещания.
Контакт: @TRAIN_LAB_manager`,

  train_lab_legality: `Ты пишешь пост о легальности и документах PODONKI.

Структура:
1. Контекст (почему легальность важна сейчас)
2. Что есть у PODONKI (сертификаты, документы)
3. Как это защищает магазин
4. CTA

Тон: Серьёзный, уверенный. "Мы белые, вот доказательства".
Контакт: @TRAIN_LAB_manager`,

  // ── PODONKI OFF (B2B табак/конструктор) ──
  podonki_off_premium: `Ты пишешь пост для канала SKULL (Podonki OFF) про табак/конструктор.

Позиционирование: ПРЕМИУМ, ЛЕГАЛЬНЫЙ, БЕЛЫЙ ПРОДУКТ.

Структура:
1. Название товара + статус
2. Премиум характеристики
3. Документы/сертификаты
4. Почему это лучше чёрного рынка
5. CTA

Тон: Уверенный, прямой. "Только белые продукты 💀"
Контакт: @SKULL_manageer`,

  podonki_off_category: `Ты пишешь сравнение категорий: табак vs жидкость для магазина.

Структура:
1. Ситуация в магазине
2. Табак: плюсы для ретейла
3. Жидкость: плюсы для ретейла
4. Когда что выбирать
5. Совет по ассортименту

Тон: Аналитический, помогающий. "Смотри по своим клиентам".
Контакт: @SKULL_manageer`,

  podonki_off_constructor: `Ты пишешь пост про конструктор как бизнес-модель.

Структура:
1. Что такое конструктор (для тех кто не знает)
2. Почему это выгодно магазину
3. Маржа и оборот
4. Как начать продавать
5. CTA

Тон: Деловой, но простой. "Вот цифры, вот факты".
Контакт: @SKULL_manageer`,

  podonki_off_legality: `Ты пишешь пост о легальности табачной продукции PODONKI.

Структура:
1. "ТОЛЬКО БЕЛЫЕ ПРОДУКТЫ" (фирменная фраза)
2. Какие документы есть
3. Чем рискует магазин без документов
4. Как PODONKI защищает партнёра
5. CTA

Тон: Серьёзный, прямой. Акцент на безопасность бизнеса.
Контакт: @SKULL_manageer`,

  // ── B2C (потребители 18-30) ──
  b2c_flavor_test: `Ты пишешь пост-обзор вкуса для молодёжи 18-30.

Стиль: КАК ДРУГ РАССКАЗЫВАЕТ ДРУГУ. Не реклама!

Структура:
1. Интригующий заголовок (1 строка)
2. Личный опыт / впечатление (2-3 строки)
3. Описание вкуса (понятно, без заумных слов)
4. Вердикт (зашёл / не зашёл / для кого)
5. Вопрос подписчикам

Тон: Дерзкий, ироничный, с юмором. "Это не реклама, это правда".
Язык: офигеть, зашло, кайф, норм, топ, база
НЕ ИСПОЛЬЗУЙ: инновационный, уникальный, премиум-сегмент`,

  b2c_lifestyle: `Ты пишешь lifestyle-пост для молодёжи 18-30 про вейп как часть жизни.

Структура:
1. Ситуация / момент дня
2. Как вейп вписывается
3. Эмоция / настроение
4. Вопрос или CTA

Тон: Чилл, вайб. Как пост в инсте у друга.
Без прямой рекламы, без "купи". Просто момент.`,

  b2c_challenge: `Ты пишешь пост-челлендж / игру для подписчиков.

Структура:
1. Крутой заголовок (CAPS или эмодзи)
2. Правила (просто, 2-3 пункта)
3. Что получишь (приз или фан)
4. CTA (пиши в комменты / отмечай друга)

Тон: Энергичный, весёлый. "Погнали!" "Кто первый?"`,

  b2c_announcement: `Ты пишешь анонс новинки для потребителей.

Структура:
1. ИНТРИГА (не говори сразу что это)
2. Намёк / тизер
3. Дата или "скоро"
4. CTA (подписывайся / включи уведомления)

Тон: Загадочный, хайповый. Создай ожидание.`,

  b2c_education: `Ты пишешь образовательный пост для молодёжи о вейпинге.

Структура:
1. Вопрос (который реально задают)
2. Ответ простым языком
3. Факт или пример
4. Вывод

Тон: Не лекция! "Короче, вот как это работает..."
Как старший друг объясняет младшему.`,

  b2c_memes: `Ты пишешь мем-пост / трендовый контент для вейп-аудитории.

Структура:
1. Заголовок-байт
2. Ситуация (узнаваемая для вейпера)
3. Панчлайн / неожиданный поворот

Тон: LOL, кринж (намеренный), самоирония.
Форматы: "Когда...", "Тот самый друг, который...", "POV:"`,

  b2c_giveaway: `Ты пишешь пост-розыгрыш / гивэвей.

Структура:
1. 🎁 ЧТО РАЗЫГРЫВАЕМ (конкретно)
2. Условия (подписка + коммент + репост)
3. Когда итоги
4. CTA

Тон: Щедрый, энергичный. "Раздаём просто так!"`,

  b2c_myth_bust: `Ты пишешь пост-развенчание мифа о вейпинге.

Структура:
1. МИФ (то что люди думают)
2. РЕАЛЬНОСТЬ (как на самом деле)
3. Доказательство / факт
4. Вывод

Тон: "Ну блин, ребят..." — как друг который шарит.`,

  b2c_comparison: `Ты пишешь сравнение вейп-продуктов для потребителей.

Структура:
1. "Что выбрать: A или B?"
2. Плюсы A
3. Плюсы B
4. Для кого что подходит
5. "А ты что выберешь?"

Тон: Объективный но с характером. Не сухая таблица.`,

  b2c_ugc: `Ты пишешь пост с пользовательским контентом (UGC).

Структура:
1. Фото/отзыв от подписчика (текст)
2. Комментарий от бренда
3. CTA (присылайте свои)

Тон: "Вот что пишут наши" — гордость, но без пафоса.`,

  b2c_polls: `Ты пишешь пост-опрос для вовлечения.

Структура:
1. Провокационный вопрос
2. Варианты ответа (2-4)
3. "Голосуй!"

Тон: Лёгкий, без нагрузки. Просто фан.`,
}

// ════════════════════════════════════════════════════════════════════
// ГЕНЕРАТОР
// ════════════════════════════════════════════════════════════════════

class PostGeneratorV2 {
  constructor(config = {}) {
    this.config = config
    this.hasApiKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'test'
    if (this.hasApiKey) {
      this.client = new Anthropic()
    }
    this.products = []
    this.rubrics = []
    this.searchIndex = new BM25Search({ halfLifeDays: 30 })
    this.loadProducts()
    this.loadRubrics()
    this.buildSearchIndex()
  }

  loadProducts() {
    try {
      const productsPath = path.join(__dirname, '../../data/products.json')
      if (fs.existsSync(productsPath)) {
        const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'))
        this.products = data.products || data
        console.log(`[+] Loaded ${this.products.length} products`)
      }
    } catch (error) {
      console.warn(`[-] Could not load products: ${error.message}`)
    }
  }

  loadRubrics() {
    try {
      const rubricsPath = path.join(__dirname, '../../data/rubrics.json')
      if (fs.existsSync(rubricsPath)) {
        this.rubrics = JSON.parse(fs.readFileSync(rubricsPath, 'utf-8'))
        console.log(`[+] Loaded ${this.rubrics.length} rubrics`)
      }
    } catch (error) {
      console.warn(`[-] Could not load rubrics: ${error.message}`)
    }
  }

  /**
   * Получить рубрики для канала
   */
  getRubrics(channel = 'b2c') {
    return this.rubrics.filter(r => r.channel === channel && r.active)
  }

  /**
   * Выбрать рубрику по весу (взвешенный рандом)
   */
  pickRubric(channel = 'b2c') {
    const rubrics = this.getRubrics(channel)
    if (!rubrics.length) return null

    const totalWeight = rubrics.reduce((sum, r) => sum + r.weight, 0)
    let random = Math.random() * totalWeight
    for (const rubric of rubrics) {
      random -= rubric.weight
      if (random <= 0) return rubric
    }
    return rubrics[0]
  }

  /**
   * Получить system prompt для рубрики
   */
  getSystemPrompt(rubricId) {
    const specific = SYSTEM_PROMPTS[rubricId]
    if (!specific) return GLOBAL_RULES

    return `${GLOBAL_RULES}\n\n---\n\nСПЕЦИФИЧНЫЕ ПРАВИЛА РУБРИКИ:\n${specific}`
  }

  /**
   * Простой текстовый эмбеддинг (детерминированный, совпадает с setup-qdrant.js)
   */
  textToVector(text) {
    const vec = new Float32Array(VECTOR_SIZE).fill(0)
    const lower = text.toLowerCase()
    for (let i = 0; i < lower.length; i++) {
      const code = lower.charCodeAt(i)
      const pos = i % VECTOR_SIZE
      vec[pos] += Math.sin(code * 0.1 + i * 0.01)
      vec[(pos + code) % VECTOR_SIZE] += Math.cos(code * 0.05 + i * 0.02)
    }
    for (let i = 0; i < lower.length - 1; i++) {
      const bigram = lower.charCodeAt(i) * 256 + lower.charCodeAt(i + 1)
      vec[bigram % VECTOR_SIZE] += 0.5
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
    if (norm > 0) for (let i = 0; i < VECTOR_SIZE; i++) vec[i] /= norm
    return Array.from(vec)
  }

  /**
   * Поиск товаров: Qdrant → BM25 fallback
   */
  async searchProducts(query, limit = 3) {
    try {
      const vector = this.textToVector(query)
      const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
        body: JSON.stringify({ vector, limit, with_payload: true }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.result.map(item => ({
          name: item.payload.name,
          category: item.payload.category,
          score: item.score,
          ...item.payload,
        }))
      }
    } catch {
      // Qdrant недоступен
    }
    return this.searchProductsLocal(query, limit)
  }

  buildSearchIndex() {
    this.searchIndex.clear()
    const docs = this.products.map(p => ({
      id: p.id || p.name,
      text: [p.name, p.description, (p.flavor_types || []).join(' '), p.target_audience || ''].join(' '),
      date: p.created_at || new Date().toISOString(),
      ...p
    }))
    this.searchIndex.addDocuments(docs)
  }

  searchProductsLocal(query, limit = 3) {
    return this.searchIndex.search(query, limit)
  }

  /**
   * Генерация одного поста
   */
  async generatePost({ channel = 'b2c', rubricId = '', topic = '', productQuery = '' } = {}) {
    // Выбрать рубрику
    let rubric
    if (rubricId) {
      rubric = this.rubrics.find(r => r.id === rubricId)
    }
    if (!rubric) {
      rubric = this.pickRubric(channel)
    }

    const promptKey = rubric?.system_prompt_key || rubricId || `${channel}_flavor_test`
    const systemPrompt = this.getSystemPrompt(promptKey)

    // Найти товары
    let productsContext = ''
    let foundProducts = []
    if (productQuery) {
      foundProducts = await this.searchProducts(productQuery, 3)
      if (foundProducts.length > 0) {
        productsContext = '\n\nТовары для поста:\n'
        foundProducts.forEach((p, i) => {
          productsContext += `${i + 1}. ${p.name} — ${p.description || ''}\n`
          if (p.flavor_types) productsContext += `   Вкусы: ${p.flavor_types.join(', ')}\n`
          if (p.nicotine_strength) productsContext += `   Крепость: ${p.nicotine_strength}\n`
        })
      }
    }

    // Mock если нет API
    if (!this.hasApiKey) {
      return {
        success: true,
        post: this.generateMockPost(rubric, productsContext),
        rubric: rubric?.name || 'unknown',
        channel,
        products: foundProducts,
        model: 'mock',
        tokens_used: 0
      }
    }

    const topicText = topic || rubric?.description || 'пост для канала'
    const userPrompt = `Напиши пост для рубрики "${rubric?.name || channel}".
Тема: ${topicText}${productsContext}

Требования:
- Пост на русском языке
- Как живой человек пишет, не нейросеть
- Короткие предложения
- Включи CTA если уместно
- Используй фирменные эмодзи`

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })

      const post = response.content[0].type === 'text' ? response.content[0].text : ''

      return {
        success: true,
        post,
        rubric: rubric?.name || 'unknown',
        channel,
        products: foundProducts,
        model: response.model,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens
      }
    } catch (error) {
      return { success: false, error: error.message, post: '' }
    }
  }

  /**
   * Mock-пост когда нет API ключа
   */
  generateMockPost(rubric, productsContext) {
    const channel = rubric?.channel || 'b2c'

    if (channel === 'train_lab') {
      return `[TRAIN LAB] ${rubric?.name || 'Товар'}

Партнёры, норм новость 🧪

Новая линейка зашла на склад. Маржа хорошая, оборот быстрый.
${productsContext}
➖ Дизайн цепляет — клиент сам берёт с витрины
➖ 40+ вкусов — есть что предложить
➖ Документы все в наличии

По вопросам @TRAIN_LAB_manager`
    }

    if (channel === 'podonki_off') {
      return `ТОЛЬКО БЕЛЫЕ ПРОДУКТЫ 💀

${rubric?.name || 'Конструктор'}
${productsContext}
Сертификаты ✅
Документы ✅
Легальность ✅

➖ Маржа выше рынка
➖ Клиент возвращается
➖ Нет проблем с законом

@SKULL_manageer`
    }

    return `${rubric?.name || 'Новый вкус'} 🔥

Короче, попробовал и офигел.
${productsContext}
Вкус держится до конца, не горчит, не приторно.
Реально зашёл.

А ты уже пробовал? Пиши в комменты 👇`
  }

  /**
   * Генерация пакета постов (по рубрикам с весами)
   */
  async generateBatch({ channel = 'b2c', count = 5, productQuery = '' } = {}) {
    console.log(`\n🚀 Генерация ${count} постов для ${channel}\n`)

    const results = []
    const usedRubrics = new Set()

    for (let i = 0; i < count; i++) {
      // Стараемся не повторять рубрики подряд
      let rubric
      let attempts = 0
      do {
        rubric = this.pickRubric(channel)
        attempts++
      } while (usedRubrics.has(rubric?.id) && attempts < 5)

      if (rubric) usedRubrics.add(rubric.id)
      if (usedRubrics.size >= this.getRubrics(channel).length) usedRubrics.clear()

      console.log(`[${i + 1}/${count}] ${rubric?.name || 'unknown'}...`)

      const result = await this.generatePost({
        channel,
        rubricId: rubric?.id,
        productQuery,
      })
      results.push(result)

      // Rate limiting
      if (this.hasApiKey) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return results
  }

  /**
   * Список доступных рубрик
   */
  listRubrics(channel) {
    const rubrics = channel ? this.getRubrics(channel) : this.rubrics
    return rubrics.map(r => ({
      id: r.id,
      name: r.name,
      channel: r.channel,
      weight: r.weight,
      hasPrompt: !!SYSTEM_PROMPTS[r.system_prompt_key],
    }))
  }
}

export default PostGeneratorV2
