# CLAUDE.md — Content-Automation (Podonki)

## Проект
Система автоматизации контента для вейп-бренда "Подонки". Парсинг Telegram, генерация постов, агентная система, бот, поиск и публикация.

## Стек
- Node.js 20+ (ESM — `"type": "module"`)
- Vitest (основные тесты) + Jest (coverage) + Playwright (e2e)
- Biome (линтер + форматтер)
- Husky (git hooks)
- SonarQube Cloud (анализ кода)
- GitHub Actions CI/CD (ubuntu-latest)

## Структура
```
src/
├── agents/        — агентная система (CLI: list, info, create, history, stats)
├── bot/           — Telegram-бот
├── db/            — база данных
├── generators/    — генерация постов и контента
├── search/        — поиск по данным
├── security/      — безопасность
└── transport/     — транспорт (отправка/публикация)

scripts/           — утилиты (parse-telegram, analyze-datasets)
config/            — конфигурации + .env
tests/             — тесты
data/              — данные продуктов и датасеты
docs/              — документация
analysis/          — аналитика
examples/          — примеры использования агентов
logs/              — логи
Материалы/         — исходные материалы бренда
.github/           — GitHub Actions workflows
```

## Команды
```bash
# Установка
npm ci

# Основные скрипты
npm run parse          # Парсинг Telegram-канала
npm run generate       # Генерация постов
npm run analyze        # Анализ датасетов
npm run sync-data      # Синхронизация данных с D:\

# Тесты
npm test               # Vitest
npm run test:jest      # Jest + coverage
npm run test:e2e       # Playwright e2e
npm run test:e2e:ui    # Playwright с UI

# Линтер
npm run lint           # Biome lint
npm run lint:fix       # Biome autofix
npm run format         # Biome format

# Агенты
npm run agent:list     # Список агентов
npm run agent:info     # Инфо об агенте
npm run agent:create   # Создать агента
npm run agent:history  # История
npm run agent:stats    # Статистика
npm run agent:example  # Пример (simple mode)
npm run agent:batch    # Пример (batch mode)

# CI/CD
git push origin main   # Триггерит GitHub Actions + SonarQube
```

## Ключевые файлы
- `podonki-products.csv` — каталог продуктов
- `podonki-products-descriptions.json` — описания
- `podonki-products-index.json` — индекс
- `CONTENT_STRATEGY.md` — контент-стратегия
- `B2C_GENERATION_SYSTEM.md` — система генерации B2C
- `SYSTEM_PROMPTS_FINAL.md` — системные промпты
- `PODONKI_OFF_TONE_ANALYSIS.md` — анализ тона бренда
- `VOICE_GUIDE_UPDATES.md` — гайд по голосу бренда

## Правила
- Коммиты: Conventional Commits (feat:, fix:, chore:, docs:)
- Перед пушем: `npm test` + `npm run lint` должны проходить
- `.env` НИКОГДА в git — только `.env.example`
- Данные продуктов (CSV/JSON) — не перезаписывать без бэкапа
- ESM синтаксис: `import/export`, НЕ `require/module.exports`
- SonarQube: 0 багов, 0 уязвимостей, покрытие >50%

## Бренд "Подонки"
- ЦА: 18-30, вейперы
- Тон: дерзкий, провокационный, с юмором, без канцелярита
- Референсы: `VOICE_GUIDE_UPDATES.md`, `PODONKI_OFF_TONE_ANALYSIS.md`

## GitHub
- Репозиторий: fr3shsmoke-ux/Podonki
- CI: GitHub Actions (ubuntu-latest)
- SonarQube Cloud: org fr3shsmoke-ux, project fr3shsmoke-ux_Podonki
- Секреты: SONAR_TOKEN, SONAR_HOST_URL
