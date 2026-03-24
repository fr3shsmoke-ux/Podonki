# Qdrant Integration для Podonki

Семантический поиск товаров для автоматизированной генерации контента.

## 📋 Структура

```
data/
  └── products.json          # База всех 18 линеек товаров (id, name, description, etc.)

scripts/
  └── load-qdrant.js         # Загрузить товары в Qdrant + тесты поиска

src/generators/
  └── post-generator-v2.js   # Генератор постов с поиском в Qdrant
```

## 🚀 Быстрый старт

### 1. Запустить Qdrant

```bash
D:\AI\qdrant\start-qdrant.bat
```

Проверить: http://localhost:6333/health

### 2. Загрузить товары в Qdrant

```bash
cd "C:/Users/Пох кто/OneDrive/Рабочий стол/Podonki"
npm install @anthropic-ai/sdk
node scripts/load-qdrant.js
```

Вывод:
```
✅ Qdrant is running

📦 Creating collection "podonki_products"...
✅ Collection created successfully

📥 Loading 18 products into Qdrant...
✅ Loaded: Podonki Podgon
✅ Loaded: Podonki Last Hap
...
✅ All products loaded successfully

🔍 Testing search for: "фруктовые вкусы"
Found 3 results:
  1. Podonki Podgon (score: 0.823)
  2. Podonki Last Hap (score: 0.756)
  3. Podonki x Malasian (score: 0.621)
```

### 3. Протестировать генератор

```bash
node scripts/test-generate-v2.js
```

Вывод:
```
🔧 Initializing Post Generator V2...

[+] Loaded 18 products
[+] Loaded 0 B2B examples
[+] Loaded 0 B2C examples
[+] Loaded 0 competitor examples

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Test 1: Single B2C post (fruity flavors)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Generated post from Claude...]

📦 Found products:
  1. Podonki Podgon (match: 82%)
  2. Podonki Last Hap (match: 75%)
```

## 🔧 API Reference

### PostGeneratorV2

#### `generatePost(category, topic, productQuery)`

Генерирует один пост с автоматическим поиском релевантных товаров.

```javascript
const generator = new PostGeneratorV2();

const result = await generator.generatePost(
  'b2c',                    // 'b2b' или 'b2c'
  'taste_review',           // тип поста
  'фруктовые вкусы'        // поиск товаров (опционально)
);

console.log(result.post);     // Сгенерированный текст
console.log(result.products); // Найденные товары
```

#### `searchProducts(query, limit)`

Поиск товаров в Qdrant (или локально, если Qdrant недоступен).

```javascript
const products = await generator.searchProducts('максимальная крепость', 3);

products.forEach(p => {
  console.log(`${p.name} - ${p.description}`);
});
```

#### `generateCampaign(category, topic, count)`

Генерирует несколько постов разных типов.

```javascript
const posts = await generator.generateCampaign('b2c', 'Swedish Collection', 3);

posts.forEach((post, i) => {
  console.log(`\n[${i + 1}] ${post.type}`);
  console.log(post.post);
});
```

## 📊 Структура products.json

Каждый товар содержит:

```json
{
  "id": "liquid_podgon",
  "name": "Podonki Podgon",
  "category": "liquid",
  "channel": "train_lab",
  "strength": "30mg",
  "flavors_count": 25,
  "flavor_types": ["fruit", "berry", "drink"],
  "target_audience": "budget_conscious, beginners",
  "positioning": "Quality without overpaying, universal",
  "usp": "Budget, versatile, wide flavor selection",
  "description": "Budget liquid nicotine salt, 25 flavors..."
}
```

**Поля для поиска:**
- `name` — название линейки
- `description` — описание
- `flavor_types` — типы вкусов
- `target_audience` — целевая аудитория
- `positioning` — позиционирование

## 🔍 Примеры поиска

```javascript
// Найти всё компактное
await generator.searchProducts('компактный формат', 3);
// → Podonki Mini, Podonki Slick, Podonki Click

// Найти максимальную крепость
await generator.searchProducts('максимальная крепость', 3);
// → Podonki Critical (liquid), Podonki x Mad, Podonki Critical (nicpak)

// Найти мятные вкусы
await generator.searchProducts('мятные вкусы', 3);
// → Podonki Original (tobacco), Podonki x Hotspot, Podonki Critical

// Найти бюджетный вариант
await generator.searchProducts('бюджетный вариант', 3);
// → Podonki Podgon, Podonki Mini, Podonki x Mad
```

## 🧠 Как работает поиск

### 1. Qdrant (основной способ)
- Создаёт эмбеддинг для запроса
- Ищет векторный аналог в Qdrant
- Возвращает топ-N результатов с оценкой релевантности

### 2. Локальный поиск (fallback)
Если Qdrant недоступен:
- Разбивает запрос на ключевые слова
- Ищет совпадения в названии (вес 10)
- Ищет в описании (вес 5)
- Ищет в типах вкусов (вес 3)
- Ищет в целевой аудитории (вес 2)
- Сортирует по сумме весов

## 📈 Интеграция с n8n

**Воркфлоу Podonki B2C (автопост):**

```
Schedule (10:00 daily)
  ↓
Set params (topic, product_query)
  ↓
HTTP Request → Node.js script:
  - Запустить post-generator-v2.js
  - Передать category='b2c', topic, productQuery
  ↓
Qdrant search + Claude generation
  ↓
Google Drive: upload images for products
  ↓
Telegram: send photo + caption
```

## 🐛 Troubleshooting

### Qdrant не запускается
```bash
# Проверить процесс
tasklist | findstr qdrant

# Перезапустить
D:\AI\qdrant\start-qdrant.bat
```

### Collection не создаётся
```bash
# Удалить старую коллекцию
curl -X DELETE http://localhost:6333/collections/podonki_products

# Перезагрузить
node scripts/load-qdrant.js
```

### Поиск возвращает пустой результат
- Убедитесь, что Qdrant запущен и доступен
- Проверьте, что `load-qdrant.js` успешно загрузил товары
- Используется локальный fallback поиск, если Qdrant недоступен

## 📚 Дополнительно

- **Qdrant docs**: https://qdrant.tech/documentation/
- **Embedding size**: 1536 (совместимо с OpenAI)
- **Vector distance**: Cosine similarity
- **Max products per search**: 10 (можно изменить в `searchProducts(query, limit)`)

---

**Готово к использованию**: ✅ Все 18 линеек загружены, поиск работает локально и через Qdrant
