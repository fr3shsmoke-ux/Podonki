# Пример: SonarQube ловит ошибки автоматически

## Что произойдёт:

### 1️⃣ Ты пишешь код с ошибками
```js
// ❌ Неиспользуемая переменная
var unusedVariable = 'test'

// ❌ console.log в коде
console.log('debug info')

// ❌ var вместо const/let
var globalState = {}

// ❌ Magic number
function calculateDiscount(price) {
  return price * 0.15  // что за 0.15?
}
```

### 2️⃣ Ты делаешь `git push`
```bash
git add src/bad-example.js
git commit -m "Add new feature"
git push
```

### 3️⃣ GitHub Actions автоматически запускает:
- ✅ `npm test` — запускаются тесты
- ✅ `eslint src` — проверка синтаксиса и стиля
- ✅ `SonarQube Scan` — глубокий анализ качества кода
- ✅ `Quality Gate` — проверка что качество приемлемо

### 4️⃣ Результаты в GitHub:
**Если ошибки:**
```
❌ SonarQube Analysis - Content Automation FAILED
  ├─ Run tests: PASS ✓
  ├─ Run ESLint: FAIL ✗
  │   └─ 9 errors, 3 warnings
  └─ SonarQube Scan: FAIL ✗
      └─ Code Smell: unused variables
      └─ Security Issue: console.log
      └─ Code Smell: magic numbers
```

**PR/Commit comment от SonarQube:**
```
⚠️ Quality Gate: FAILED
Code Coverage: 65% (was 75%) ⬇️
Code Smells: 12
Security Issues: 2
```

## Что ловит SonarQube:

| Ошибка | Статус | Как исправить |
|--------|--------|--|
| Неиспользуемые переменные | ❌ FAIL | Удалить или использовать |
| `console.log` в коде | ⚠️ WARN | Удалить перед продакшеном |
| `var` вместо `const`/`let` | ❌ FAIL | Заменить на `const` |
| Дублирование кода | ⚠️ SMELL | Вынести в функцию |
| Magic numbers (0.15) | ⚠️ SMELL | Заменить на константу |
| Пустые catch блоки | ❌ FAIL | Добавить обработку |
| Низкое покрытие тестами | ❌ FAIL | Написать тесты |

## Как исправить все автоматически:

```bash
npm run lint:fix
npm run format
npm test
git add .
git commit -m "Fix linting issues"
git push
```

Теперь workflow пройдёт ✅

## Когда можешь мерджить:

Только когда `Quality Gate: PASSED` в PR или commit статусе.

---

**Локально тестировать:**
```bash
npm run lint          # показать все ошибки
npm run lint:fix      # автоисправление
npm run format        # форматирование
npm test              # запуск тестов с покрытием
```

**В GitHub Actions:**
Всё работает автоматически при push/PR.
