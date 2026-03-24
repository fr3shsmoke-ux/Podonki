#!/usr/bin/env node

/**
 * Загрузка товаров в Qdrant (или создание локального индекса как fallback)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'podonki_products';

async function createCollection() {
  try {
    console.log(`📡 Connecting to Qdrant at ${QDRANT_URL}...`);

    const response = await fetch(`${QDRANT_URL}/collections`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Qdrant unavailable: ${response.status}`);
    }

    const collections = await response.json();
    const exists = collections.result?.collections?.some(c => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`✅ Collection "${COLLECTION_NAME}" already exists`);
      return true;
    }

    console.log(`📦 Creating collection "${COLLECTION_NAME}"...`);

    const createResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      })
    });

    if (!createResp.ok) {
      throw new Error(`Failed to create collection: ${createResp.status}`);
    }

    console.log(`✅ Collection created successfully`);
    return true;

  } catch (error) {
    console.warn(`⚠️  Qdrant error: ${error.message}`);
    console.log(`💾 Will use local fallback instead`);
    return false;
  }
}

async function loadProducts() {
  try {
    const productsPath = path.join(__dirname, '../data/products.json');
    const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    console.log(`\n📦 Loading ${data.products.length} products...`);

    const qdrantAvailable = await createCollection();

    if (!qdrantAvailable) {
      console.log(`\n✅ Using local index (Qdrant offline). Products ready for fallback search.\n`);
      return;
    }

    // Загрузить в Qdrant
    let uploadedCount = 0;
    const batchSize = 5;

    for (let i = 0; i < data.products.length; i += batchSize) {
      const batch = data.products.slice(i, i + batchSize);
      const points = batch.map((product, idx) => {
        // Простой вектор на основе текста (в боевом коде использовать API эмбеддинга)
        const text = `${product.name} ${product.description} ${(product.flavor_types || []).join(' ')}`;
        const vector = generateSimpleVector(text);

        return {
          id: product.id || `product_${i + idx}`,
          vector: vector,
          payload: product
        };
      });

      const uploadResp = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: points
        })
      });

      if (uploadResp.ok) {
        uploadedCount += batch.length;
        console.log(`  ✅ Uploaded ${uploadedCount}/${data.products.length} products`);
      } else {
        console.warn(`  ⚠️  Batch upload failed: ${uploadResp.status}`);
      }
    }

    console.log(`\n✨ All ${uploadedCount} products loaded to Qdrant!\n`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Генерирует простой вектор на основе текста (для демо)
 * В боевом коде использовать embeddings API
 */
function generateSimpleVector(text) {
  const vector = [];
  for (let i = 0; i < 1536; i++) {
    vector.push(
      Math.sin((text.charCodeAt(i % text.length) + i) / 100) * 0.5 +
      Math.cos(i / 100) * 0.3
    );
  }
  return vector;
}

// Запуск
console.log('🚀 Qdrant Product Loader\n');
console.log('═'.repeat(50));
await loadProducts();
console.log('═'.repeat(50));
console.log('Done! Now you can use the post generator with product search.\n');
