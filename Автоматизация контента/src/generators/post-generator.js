/**
 * Post Generator
 * Генерирует посты для каналов на основе датасетов обучения
 */

const fs = require('fs');
const path = require('path');

class PostGenerator {
  constructor(config = {}) {
    this.config = config;
    this.trainingData = {
      b2b: [],
      b2c: [],
      competitors: [],
    };
    this.loadTrainingData();
  }

  loadTrainingData() {
    const datasetDir = path.join(__dirname, '../../data/datasets');

    if (fs.existsSync(datasetDir)) {
      // Загружаем B2B датасеты
      const b2bFiles = fs.readdirSync(datasetDir)
        .filter(f => f.includes('own-b2b') && f.endsWith('.jsonl'));

      for (const file of b2bFiles) {
        this.loadJSONL(path.join(datasetDir, file), 'b2b');
      }

      // Загружаем B2C датасеты
      const b2cFiles = fs.readdirSync(datasetDir)
        .filter(f => f.includes('own-b2c') && f.endsWith('.jsonl'));

      for (const file of b2cFiles) {
        this.loadJSONL(path.join(datasetDir, file), 'b2c');
      }

      // Загружаем конкурентов для анализа
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

      // Топ слова
      const words = text.toLowerCase().split(/\s+/).slice(0, 10);
      for (const word of words) {
        styles.topWords[word] = (styles.topWords[word] || 0) + 1;
      }
    }

    const count = data.length;
    return {
      sampleCount: count,
      averageLength: Math.round(styles.averageLength / count),
      headlinePercentage: Math.round((styles.hasHeadline / count) * 100),
      listPercentage: Math.round((styles.hasList / count) * 100),
      boldPercentage: Math.round((styles.hasBold / count) * 100),
      emojiPercentage: Math.round((styles.hasEmoji / count) * 100),
      averageParagraphs: Math.round((styles.hasParagraphs / count) * 100) / 100,
      topWords: Object.entries(styles.topWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count })),
    };
  }

  /**
   * Получает примеры постов для референса
   */
  getExamples(category = 'b2b', count = 5) {
    const data = this.trainingData[category];
    if (data.length === 0) return [];

    // Возвращаем случайные примеры
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(item => ({
      text: item.originalText || item.text,
      metadata: item.metadata,
      date: item.date,
    }));
  }

  /**
   * Подготавливает промпт для Claude/Ollama
   */
  createSystemPrompt(category = 'b2b') {
    const style = this.analyzeStyle(category);
    const examples = this.getExamples(category, 3);

    let prompt = `Ты — профессиональный контент-райтер для ${category === 'b2b' ? 'B2B' : 'B2C'} канала Podonki.

## Стиль и характеристики
- Средняя длина поста: ${style.averageLength} символов
- Используются заголовки: ${style.headlinePercentage}% постов
- Используются списки: ${style.listPercentage}% постов
- Используется жирный текст: ${style.boldPercentage}% постов
- Используются emoji: ${style.emojiPercentage}% постов
- Среднее количество абзацев: ${style.averageParagraphs}

## Часто встречающиеся слова
${style.topWords.map(w => `- ${w.word} (${w.count}x)`).join('\n')}

## Примеры постов в твоем стиле
${examples.map((ex, i) => `
### Пример ${i + 1}
\`\`\`
${ex.text}
\`\`\`
`).join('\n')}

## Правила
1. Пиши посты в соответствии с примерами выше
2. Сохраняй структуру: заголовок → основной контент → CTA
3. Используй emoji если это часто встречается в примерах
4. Не повторяй дословно примеры, но следуй их стилю
5. Пиши для ${category === 'b2b' ? 'B2B аудитории (менеджеры, специалисты)' : 'B2C аудитории (конечные потребители)'}

Готов писать посты. Какой пост нужен?`;

    return prompt;
  }

  /**
   * Сохраняет анализ в файл
   */
  saveAnalysis(outputPath = './data/processed/style-analysis.json') {
    const analysis = {
      timestamp: new Date().toISOString(),
      b2b: this.analyzeStyle('b2b'),
      b2c: this.analyzeStyle('b2c'),
      competitors: this.analyzeStyle('competitors'),
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`[+] Style analysis saved to ${outputPath}`);
    return analysis;
  }
}

// Export для использования в других модулях
module.exports = PostGenerator;

// Если запущен прямо
if (require.main === module) {
  const generator = new PostGenerator();

  console.log('\n=== STYLE ANALYSIS ===\n');

  console.log('📌 B2B Style:');
  console.log(JSON.stringify(generator.analyzeStyle('b2b'), null, 2));

  console.log('\n📌 B2C Style:');
  console.log(JSON.stringify(generator.analyzeStyle('b2c'), null, 2));

  console.log('\n📌 System Prompt for B2B:');
  console.log(generator.createSystemPrompt('b2b'));

  console.log('\n=== SAVING ANALYSIS ===\n');
  generator.saveAnalysis();
}
