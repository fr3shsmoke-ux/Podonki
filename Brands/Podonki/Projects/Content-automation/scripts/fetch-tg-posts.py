#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер постов из Telegram каналов через Telethon User API
Использует сохранённую сессию для избежания FloodWait
"""

import asyncio
import json
import sys
import io
from pathlib import Path
from telethon import TelegramClient
from telethon.errors import FloodWaitError

# UTF-8 fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API credentials
API_ID = 10497335
API_HASH = '09fb2fc7c61c928cf5515006516ec6aa'

# Каналы для парсинга (username или ID)
CHANNELS = [
    'podonki_official',  # Основной канал Podonki
    'random_beast',       # Конкурент 1
    'catswill_vape'       # Конкурент 2
]

# Пути
SESSION_FILE = Path.home() / '.podonki_session'
OUTPUT_FILE = Path('posts-data.json')

async def create_session():
    """Создать новую сессию (используем предзаданный номер)"""
    client = TelegramClient(str(SESSION_FILE), API_ID, API_HASH)

    # Используем номер телефона
    phone = '+79062526221'

    print("\n🔐 Авторизация в Telegram User API...")
    print(f"📱 Используется номер: {phone}\n")

    try:
        await client.start(phone=phone)
        print("\n✅ Сессия создана и сохранена\n")
    except Exception as e:
        print(f"❌ Ошибка авторизации: {e}")
        print("Убедись что номер правильный и ты получил код подтверждения в Telegram")
        raise

    return client

async def fetch_posts(client, channel, limit=100):
    """Получить посты из канала"""
    print(f"📢 Загружаю посты из {channel}...")

    try:
        posts = []
        async for message in client.iter_messages(channel, limit=limit):
            if message.text:
                posts.append({
                    'id': message.id,
                    'date': str(message.date),
                    'text': message.text,
                    'media': message.media is not None,
                    'channel': channel
                })

        print(f"   ✓ Загружено {len(posts)} постов")
        return posts

    except FloodWaitError as e:
        print(f"   ⚠️  FloodWait: нужно подождать {e.seconds} секунд")
        await asyncio.sleep(e.seconds + 1)
        return await fetch_posts(client, channel, limit)

    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return []

async def main():
    print("\n" + "="*60)
    print("  TELEGRAM POSTS PARSER")
    print("="*60 + "\n")

    # Проверяем сессию
    if not SESSION_FILE.exists():
        print("⚠️  Сессия не найдена. Создаю новую...\n")
        client = await create_session()
    else:
        print("✅ Используется сохранённая сессия\n")
        client = TelegramClient(str(SESSION_FILE), API_ID, API_HASH)
        await client.connect()

    all_posts = []

    # Парсим все каналы
    for channel in CHANNELS:
        posts = await fetch_posts(client, channel, limit=50)
        all_posts.extend(posts)

    # Сохраняем результат
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_posts, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Сохранено {len(all_posts)} постов в {OUTPUT_FILE}")

    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
