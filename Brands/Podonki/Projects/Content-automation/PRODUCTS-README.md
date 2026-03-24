# Podonki Products Database — Структурированные описания

Полная база описаний 20 продуктов Podonki, извлечённых из официальных Telegram-каналов.

## Файлы

### 1. **podonki-products-descriptions.json** (основной)
Полные описания всех 20 продуктов.

**Структура:**
```json
{
  "id": "liquid_podgon",
  "name": "Podonki Podgon",
  "category": "Жидкость для вейпа",
  "type": "liquid",
  "flavors": 25,
  "detailed_description": "Подробное описание 350-500 символов..."
}
```

**Использование:**
```javascript
const products = require('./podonki-products-descriptions.json')
const product = products.find(p => p.id === 'liquid_podgon')
console.log(product.detailed_description)
```

---

### 2. **podonki-products-index.json** (быстрый поиск)
Индекс для быстрого доступа к продуктам по типам и категориям.

**Структура:**
```json
{
  "by_type": {
    "liquid": ["liquid_podgon", "liquid_last_hap", ...],
    "snus": ["snus_slick"],
    "nicpak": ["nikpak_critical", ...],
    "chewing_tobacco": ["chew_mini", ...],
    "constructor": ["constructor_classic", ...]
  },
  "by_category": {
    "Жидкость для вейпа": [...],
    "Снюс": [...],
    ...
  },
  "all_products": [...]
}
```

**Использование:**
```javascript
const index = require('./podonki-products-index.json')

// Get all liquids
const liquids = index.by_type.liquid

// Get all PDNK products
const pdnk = index.by_category['Жевательный табак']
```

---

### 3. **podonki-products.csv** (для таблиц)
CSV-экспорт для использования в Google Sheets, Excel, Airtable.

**Колонки:**
- ID
- Name
- Category
- Type
- Flavors
- Description Preview

**Использование:** Импортируй в любую таблицу через `Файл → Импорт`

---

### 4. **EXTRACTION-REPORT.md** (документация)
Полный отчёт о процессе извлечения, статистика, источники.

---

## Быстрый старт

### Для контент-маркетинга
```javascript
const products = require('./podonki-products-descriptions.json')

// Получить описание для TikTok поста
const liquid = products.find(p => p.id === 'liquid_light')
const tiktok_text = liquid.detailed_description.substring(0, 250) + '...'
```

### Для интеграции в CMS
```javascript
// Импортируй JSON в админ-панель
const allProducts = require('./podonki-products-descriptions.json')
const productsByType = groupBy(allProducts, 'type')
```

### Для аналитики
```python
import json

with open('podonki-products.csv') as f:
    df = pd.read_csv(f)
    print(df.groupby('Type').size())  # Count by type
```

---

## Продукты по категориям

### Жидкости для вейпа (9)
| ID | Название | Вкусов |
|----|----------|--------|
| liquid_podgon | Podonki Podgon | 25 |
| liquid_last_hap | Podonki Last Hap | 40 |
| liquid_resonance | Podonki x Hotspot Resonance | 15 |
| liquid_light | Podonki Light | 15 |
| liquid_sour | Podonki Sour | 20 |
| liquid_isterika | Podonki Isterika | 15 |
| liquid_critical | Podonki Critical | 15 |
| liquid_malasian | Podonki x Malasian | 12 |
| liquid_arcade | Podonki x Malasian Arcade | 20 |

### Снюс (1)
| ID | Название | Вкусов |
|----|----------|--------|
| snus_slick | Podonki Slick | 10 |

### Никпаки (3)
| ID | Название | Вкусов |
|----|----------|--------|
| nikpak_critical | Podonki Critical | 10 |
| nikpak_mad | Podonki x Mad | 10 |
| nikpak_original | Podonki Original | 10 |

### Жевательный табак (4)
| ID | Название | Вкусов |
|----|----------|--------|
| chew_mini | PDNK Mini | 6 |
| chew_original | PDNK Original | 5 |
| chew_click | PDNK Click | 10 |
| chew_swedish | PDNK Swedish Collection | 4 |

### Конструкторы вкусов (3)
| ID | Название | Вкусов |
|----|----------|--------|
| constructor_classic | Podgonki Classic | 43 |
| constructor_sour | Podgonki Sour | 43 |
| constructor_american | Podgonki American | 43 |

---

## Качество данных

✓ Все описания содержат:
- Молодёжный тон (как в оригинальных постах)
- Позиционирование продукта
- Целевую аудиторию
- Ключевые характеристики
- 350–500 символов (оптимально для контента)

✓ Источники:
- TrainLab (13 продуктов)
- PodonkiOFF (4 продукта)
- Podonki b2c (3 продукта)

---

## Расширение базы

### Добавить новый продукт
```javascript
const products = require('./podonki-products-descriptions.json')

products.push({
  id: 'new_product_id',
  name: 'New Product Name',
  category: 'Category',
  type: 'type',
  flavors: 25,
  detailed_description: '...'
})

fs.writeFileSync(
  './podonki-products-descriptions.json',
  JSON.stringify(products, null, 2)
)
```

### Обновить описание
```javascript
const products = require('./podonki-products-descriptions.json')
const product = products.find(p => p.id === 'liquid_podgon')
product.detailed_description = 'Новое описание...'
// Сохрани обратно в файл
```

---

## Интеграция с инструментами

### n8n (автоматизация постов)
```javascript
// В n8n используй как webhook data source
const products = require('./podonki-products-descriptions.json')
return products.filter(p => p.type === 'liquid')
```

### Google Sheets
1. Скачай `podonki-products.csv`
2. `Файл → Импорт → Загрузить`
3. Выбери опции импорта
4. Используй в контент-плане

### Airtable
1. Создай base
2. `+` → CSV Import
3. Загрузи `podonki-products.csv`
4. Настрой поля и фильтры

---

## FAQ

**Q: Как использовать в TikTok постах?**
A: Возьми `detailed_description`, сократи первые 2-3 предложения, добавь эмодзи и хэштеги.

**Q: Можно ли менять текст описаний?**
A: Да, адаптируй под конкретный канал (сокращай для TikTok, расширяй для Telegram).

**Q: Где взять названия всех вкусов?**
A: Они указаны в исходных каналах (TrainLab, PodonkiOFF). Предлагаю добавить в следующую версию.

**Q: Как обновлять базу?**
A: Периодически проверяй каналы на новые линейки и добавляй их в JSON.

---

## Поддержка

Файлы находятся в:
`C:/Users/Пох кто/OneDrive/Рабочий стол/Projects/Podonki/Projects/Content-automation/`

---

**Версия:** 1.0
**Дата:** 14 марта 2026
**Статус:** ✓ Готово к использованию
