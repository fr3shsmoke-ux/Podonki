import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'podonki_products';

class PostGeneratorV2 {
  constructor(config = {}) {
    this.config = config;
    this.hasApiKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'test';
    if (this.hasApiKey) {
      this.client = new Anthropic();
    }
    this.products = [];
    this.trainingData = {
      b2b: [],
      b2c: [],
      competitors: [],
    };
    this.loadProducts();
    this.loadTrainingData();
  }

  loadProducts() {
    try {
      const productsPath = path.join(__dirname, '../../data/products.json');
      if (fs.existsSync(productsPath)) {
        const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
        this.products = data.products;
        console.log(`[+] Loaded ${this.products.length} products`);
      }
    } catch (error) {
      console.warn(`[-] Could not load products: ${error.message}`);
    }
  }

  loadTrainingData() {
    const datasetDir = path.join(__dirname, '../../data/datasets');

    if (fs.existsSync(datasetDir)) {
      const b2bFiles = fs.readdirSync(datasetDir)
        .filter(f => f.includes('own-b2b') && f.endsWith('.jsonl'));

      for (const file of b2bFiles) {
        this.loadJSONL(path.join(datasetDir, file), 'b2b');
      }

      const b2cFiles = fs.readdirSync(datasetDir)
        .filter(f => f.includes('own-b2c') && f.endsWith('.jsonl'));

      for (const file of b2cFiles) {
        this.loadJSONL(path.join(datasetDir, file), 'b2c');
      }

      const compFiles = fs.readdirSync(datasetDir)
        .filter(f => f.includes('competitor') && f.endsWith('.jsonl'));

      for (const file of compFiles) {
        this.loadJSONL(path.join(datasetDir, file), 'competitors');
      }
    }

    console.log(`[+] Loaded ${this.trainingData.b2b.length} B2B examples`);
    console.log(`[+] Loaded ${this.trainingData.b2c.length} B2C examples`);
    console.log(`[+] Loaded ${this.trainingData.competitors.length} competitor examples`);
  }

  loadJSONL(filePath, category) {
    if (!fs.existsSync(filePath)) return;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        this.trainingData[category].push(obj);
      } catch (e) {
        // Skip invalid lines
      }
    }
  }

  /**
   * Поиск релевантных товаров в Qdrant
   */
  async searchProducts(query, limit = 3) {
    try {
      // Попытка поиска в Qdrant
      const embedding = await this.getQueryEmbedding(query);

      const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: embedding,
          limit: limit,
          with_payload: true
        })
      });

      if (response.ok) {
        const results = await response.json();
        return results.result.map(item => ({
          name: item.payload.name,
          category: item.payload.category,
          score: item.score,
          ...item.payload
        }));
      }
    } catch (error) {
      console.warn(`[-] Qdrant search failed, falling back to local search`);
    }

    // Fallback: локальный поиск по ключевым словам
    return this.searchProductsLocal(query, limit);
  }

  /**
   * Локальный поиск товаров по ключевым словам
   */
  searchProductsLocal(query, limit = 3) {
    const keywords = query.toLowerCase().split(/\s+/);

    const scored = this.products.map(product => {
      let score = 0;

      // Поиск в названии
      if (keywords.some(k => product.name.toLowerCase().includes(k))) score += 10;

      // Поиск в описании
      if (keywords.some(k => product.description.toLowerCase().includes(k))) score += 5;

      // Поиск в типах вкусов
      if (product.flavor_types) {
        if (keywords.some(k => product.flavor_types.join(' ').toLowerCase().includes(k))) score += 3;
      }

      // Поиск в целевой аудитории
      if (product.target_audience) {
        if (keywords.some(k => product.target_audience.toLowerCase().includes(k))) score += 2;
      }

      return { ...product, score };
    });

    return scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Получить эмбеддинг для запроса
   */
  async getQueryEmbedding(query) {
    // Простой хеш-бейзд эмбеддинг (в продакшене использовать настоящий API)
    const vector = new Array(1536).fill(0);

    for (let i = 0; i < query.length; i++) {
      vector[i % 1536] += query.charCodeAt(i) / 1000;
    }

    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => norm > 0 ? val / norm : 0);
  }

  /**
   * Анализирует стиль постов для конкретной аудитории
   */
  analyzeStyle(category = 'b2b') {
    const data = this.trainingData[category];
    if (data.length === 0) return null;

    const styles = {
      averageLength: 0,
      hasHeadline: 0,
      hasList: 0,
      hasBold: 0,
      hasEmoji: 0,
      hasParagraphs: 0,
      topWords: {},
    };

    for (const item of data) {
      const text = item.text || item.originalText || '';
      const meta = item.metadata || {};

      styles.averageLength += text.length;
      styles.hasHeadline += meta.hasHeadline ? 1 : 0;
      styles.hasList += meta.hasList ? 1 : 0;
      styles.hasBold += meta.hasBold ? 1 : 0;
      styles.hasEmoji += /[\u{1F300}-\u{1F9FF}]/u.test(text) ? 1 : 0;
      styles.hasParagraphs += meta.paragraphs || 0;

      const words = text.toLowerCase().split(/\s+/).slice(0, 10);
      for (const word of words) {
        styles.topWords[word] = (styles.topWords[word] || 0) + 1;
      }
    }

    styles.averageLength = Math.round(styles.averageLength / data.length);
    styles.hasHeadline = Math.round((styles.hasHeadline / data.length) * 100);
    styles.hasList = Math.round((styles.hasList / data.length) * 100);
    styles.hasBold = Math.round((styles.hasBold / data.length) * 100);
    styles.hasEmoji = Math.round((styles.hasEmoji / data.length) * 100);

    return styles;
  }

  /**
   * Создаёт промпт для генерации поста
   */
  createSystemPrompt(category = 'b2b', topic = 'product_announcement') {
    const style = this.analyzeStyle(category);

    let prompt = `You are a content specialist for Podonki, a vape and nicotine product brand.

Category: ${category === 'b2b' ? 'B2B (wholesale partners)' : 'B2C (consumers 16-23)'}
Topic: ${topic}

Brand voice guidelines:
- For B2B: Professional but friendly, focus on benefits for partners
- For B2C: Ironic, energetic, trendy, use memes and humor
- Language: Russian (естественный, живой тон)
- NO corporate clichés ("инновационный", "уникальный", "проведены исследования")
- Short sentences, personal pronouns, conversational lexicon

Write engaging, authentic posts that resonate with the audience.
Keep it natural, like talking to a friend.`;

    if (style) {
      prompt += `\n\nStyle patterns from ${category} posts:
- Average length: ${style.averageLength} characters
- Use emojis: ${style.hasEmoji}% of posts
- Use lists: ${style.hasList}% of posts
- Use bold: ${style.hasBold}% of posts
- With headlines: ${style.hasHeadline}% of posts`;
    }

    return prompt;
  }

  /**
   * Генерирует пост с использованием Claude API
   */
  async generatePost(category = 'b2b', topic = 'product_announcement', productQuery = '') {
    try {
      // Найти релевантные товары
      let foundProducts = [];
      let productsContext = '';
      if (productQuery) {
        foundProducts = await this.searchProducts(productQuery, 3);
        if (foundProducts.length > 0) {
          productsContext = '\n\nRelevant products:\n';
          foundProducts.forEach((p, i) => {
            productsContext += `${i + 1}. ${p.name} - ${p.description}\n`;
          });
        }
      }

      // Если нет API ключа, вернуть mock результат
      if (!this.hasApiKey) {
        return {
          success: true,
          post: `[MOCK POST - ${category.toUpperCase()}]\n\nTopic: ${topic}\n${productsContext}`,
          products: foundProducts,
          model: 'mock',
          tokens_used: 0
        };
      }

      const systemPrompt = this.createSystemPrompt(category, topic);

      const userPrompt = `Generate a ${category} post about: ${topic}${productQuery ? ` (related to: ${productQuery})` : ''}

${productsContext}

Make it:
- Engaging and authentic
- Appropriate for the ${category} audience
- Include call-to-action if relevant
- Keep tone natural and conversational`;

      const response = await this.client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      return {
        success: true,
        post: response.content[0].type === 'text' ? response.content[0].text : '',
        products: foundProducts,
        model: response.model,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        post: ''
      };
    }
  }

  /**
   * Генерирует несколько постов разных типов
   */
  async generateCampaign(category = 'b2c', topic = 'new_liquid_flavor', count = 3) {
    console.log(`\n🚀 Generating ${count} ${category} posts about: ${topic}\n`);

    const postTypes = [
      'taste_review',
      'lifestyle_post',
      'comparison_post',
      'user_testimonial',
      'promotional_offer'
    ];

    const results = [];

    for (let i = 0; i < count; i++) {
      const postType = postTypes[i % postTypes.length];
      console.log(`[${i + 1}/${count}] Generating ${postType}...`);

      const result = await this.generatePost(category, postType, topic);
      results.push({
        type: postType,
        ...result
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

export default PostGeneratorV2;
