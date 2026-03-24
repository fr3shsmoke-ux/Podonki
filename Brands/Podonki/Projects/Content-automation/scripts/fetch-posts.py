from telethon import TelegramClient
import json
import asyncio

API_ID = 10497335
API_HASH = '09fb2fc7c61c928cf5515006516ec6aa'
PHONE = '+79999999999'  # Замени на свой номер

CHANNELS = [
    -1001662279308,  # Канал 1
]

async def fetch_posts():
    client = TelegramClient('session', API_ID, API_HASH)

    try:
        await client.start(phone=PHONE)
        print('✓ Подключено')

        posts_data = {}

        for channel_id in CHANNELS:
            print(f'\n📢 Канал {channel_id}...')
            posts = []

            async for message in client.iter_messages(channel_id, limit=100):
                if message.text:
                    posts.append({
                        'id': message.id,
                        'date': str(message.date),
                        'text': message.text,
                        'has_photo': message.photo is not None
                    })

            posts_data[str(channel_id)] = posts
            print(f'  Найдено {len(posts)} постов')

        with open('posts.json', 'w', encoding='utf-8') as f:
            json.dump(posts_data, f, ensure_ascii=False, indent=2)

        print('\n✓ Сохранено в posts.json')

    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(fetch_posts())
