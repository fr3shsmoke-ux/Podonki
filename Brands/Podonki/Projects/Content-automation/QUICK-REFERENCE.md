# Podonki Products — Quick Reference

## Все ID продуктов (для копирования)

### Жидкости для вейпа
```
liquid_podgon
liquid_last_hap
liquid_resonance
liquid_light
liquid_sour
liquid_isterika
liquid_critical
liquid_malasian
liquid_arcade
```

### Снюс
```
snus_slick
```

### Никпаки
```
nikpak_critical
nikpak_mad
nikpak_original
```

### Жевательный табак (PDNK)
```
chew_mini
chew_original
chew_click
chew_swedish
```

### Конструкторы вкусов (Podgonki)
```
constructor_classic
constructor_sour
constructor_american
```

---

## Все названия продуктов

### Жидкости для вейпа (9)
1. Podonki Podgon
2. Podonki Last Hap
3. Podonki x Hotspot Resonance
4. Podonki Light
5. Podonki Sour
6. Podonki Isterika
7. Podonki Critical
8. Podonki x Malasian
9. Podonki x Malasian Arcade

### Снюс (1)
10. Podonki Slick

### Никпаки (3)
11. Podonki Critical (никпак)
12. Podonki x Mad
13. Podonki Original

### Жевательный табак (4)
14. PDNK Mini
15. PDNK Original
16. PDNK Click
17. PDNK Swedish Collection

### Конструкторы вкусов (3)
18. Podgonki Classic
19. Podgonki Sour
20. Podgonki American

---

## Группировка по типам

```javascript
// Для использования в коде
const types = {
  liquid: 9,           // Жидкости для вейпа
  chewing_tobacco: 4,  // Жевательный табак
  nicpak: 3,           // Никпаки
  constructor: 3,      // Конструкторы
  snus: 1              // Снюс
}
```

---

## Фильтры для поиска

### По типу вейпа
- `type: 'liquid'` — жидкости (9 шт)
- `type: 'snus'` — снюс (1 шт)
- `type: 'nicpak'` — никпаки (3 шт)

### По табаку
- `type: 'chewing_tobacco'` — жевательный табак (4 шт)
- `type: 'constructor'` — конструкторы (3 шт)

### По марке
- `name.includes('PDNK')` — все PDNK (4 шт)
- `name.includes('Malasian')` — коллаборации Malasian (2 шт)
- `name.includes('x')` — все коллаборации (5 шт)
- `name.includes('Light')` — Light линейка (1 шт)

---

## Сортировка по количеству вкусов

### По убыванию (больше всего вкусов)
1. Podgonki Classic — 43
2. Podgonki Sour — 43
3. Podgonki American — 43
4. Podonki Last Hap — 40
5. Podonki Sour — 20
6. Podonki x Malasian Arcade — 20
7. Podonki Podgon — 25
8. Podonki x Hotspot Resonance — 15
9. Podonki Light — 15
10. Podonki Isterika — 15
11. Podonki Critical — 15
12. Podonki x Malasian — 12
13. PDNK Click — 10
14. Podonki Slick — 10
15. Podonki Critical (никпак) — 10
16. Podonki x Mad — 10
17. Podonki Original — 10
18. PDNK Mini — 6
19. PDNK Original — 5
20. PDNK Swedish Collection — 4

---

## Примеры запросов

### JavaScript
```javascript
// Найти все жидкости
products.filter(p => p.type === 'liquid')

// Найти продукт по ID
products.find(p => p.id === 'liquid_light')

// Найти все PDNK
products.filter(p => p.name.includes('PDNK'))

// Найти всё с более чем 20 вкусами
products.filter(p => p.flavors > 20)

// Получить описание
const product = products.find(p => p.id === 'liquid_podgon')
console.log(product.detailed_description)
```

### Python
```python
import json
with open('podonki-products-descriptions.json') as f:
    products = json.load(f)

# Все жидкости
liquids = [p for p in products if p['type'] == 'liquid']

# PDNK продукты
pdnk = [p for p in products if 'PDNK' in p['name']]

# Больше 20 вкусов
large = [p for p in products if p['flavors'] > 20]
```

### SQL (если импортировал в БД)
```sql
-- Все жидкости
SELECT * FROM products WHERE type = 'liquid'

-- Все коллаборации
SELECT * FROM products WHERE name LIKE '%x%'

-- Сортировка по вкусам
SELECT * FROM products ORDER BY flavors DESC
```

---

## Структура одного продукта

```json
{
  "id": "liquid_light",
  "name": "Podonki Light",
  "category": "Жидкость для вейпа",
  "type": "liquid",
  "flavors": 15,
  "detailed_description": "Light — ответ на усталость от перегруза. Это не «лёгкая жидкость», а возвращение баланса: премиальная база с ноль тяжести. Сохранили всё, за что ты полюбил Podonki, но добавили пространства для дыхания. Light выбирает осознанный потребитель, который ищет баланс: не меньше никотина, а больше контроля над ощущениями. Как глоток свежего воздуха — 15 вкусов, которые наслаждаются вкусом, а не борются с дымом. Идеален для длительных сеансов без усталости."
}
```

---

## Константы для использования в коде

```javascript
const PRODUCT_TYPES = {
  LIQUID: 'liquid',
  SNUS: 'snus',
  NICPAK: 'nicpak',
  CHEWING_TOBACCO: 'chewing_tobacco',
  CONSTRUCTOR: 'constructor'
}

const PRODUCT_CATEGORIES = {
  LIQUID: 'Жидкость для вейпа',
  SNUS: 'Снюс',
  NICPAK: 'Никпак',
  CHEWING_TOBACCO: 'Жевательный табак',
  CONSTRUCTOR: 'Конструктор вкусов'
}

const TOTAL_PRODUCTS = 20
const TOTAL_FLAVORS = 231 // Sum of all flavors
```

---

## Размер базы

```
JSON файл: 18 KB
CSV файл: 3 KB
Index файл: 4 KB
Документация: ~25 KB
───────────────
ВСЕГО: 50 KB
```

---

## Статистика вкусов

```
Всего вкусов: ~231+
Средний: 11.5 на продукт
Максимум: 43 (Podgonki)
Минимум: 4 (PDNK Swedish)

По категориям:
- Жидкости: ~155 вкусов
- Конструкторы: ~129 вкусов
- PDNK: 25 вкусов
- Никпаки: 30 вкусов
- Снюс: 10 вкусов
```

---

## Для копирования в n8n

```json
{
  "datasource": "podonki_products",
  "version": "1.0",
  "total": 20,
  "updated": "2026-03-14",
  "endpoint": "http://localhost:3000/api/products"
}
```

---

## Быстрые команды

### Получить случайный продукт
```javascript
const random = products[Math.floor(Math.random() * products.length)]
```

### Получить статистику
```javascript
const stats = {
  total: products.length,
  byType: products.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1
    return acc
  }, {}),
  totalFlavors: products.reduce((sum, p) => sum + p.flavors, 0)
}
```

### Форматировать для TikTok
```javascript
const tiktok = products.map(p => ({
  ...p,
  short_desc: p.detailed_description.substring(0, 100) + '...',
  hashtags: p.type === 'liquid' ? '#podonki #vape #liquid' : '#podonki'
}))
```

---

**Версия:** 1.0 | **Дата:** 14 марта 2026 | **Продуктов:** 20
