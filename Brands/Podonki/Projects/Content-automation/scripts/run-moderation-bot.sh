#!/bin/bash
# Запуск модератора постов Podonki

echo "================================"
echo "Модератор постов PODONKI"
echo "================================"
echo ""

# Проверить токен
TOKEN_FILE="$HOME/.claude/api-keys/telegram-bot-token"
if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ ОШИБКА: Токен Telegram бота не найден"
    echo "   Файл должен быть: $TOKEN_FILE"
    echo "   Создай файл с токеном и попробуй снова"
    exit 1
fi

echo "✅ Токен найден"
echo ""

# Проверить Python
python --version || exit 1
echo ""

# Запустить бота
echo "🚀 Запускаю бота..."
echo ""
python scripts/moderation_bot.py

