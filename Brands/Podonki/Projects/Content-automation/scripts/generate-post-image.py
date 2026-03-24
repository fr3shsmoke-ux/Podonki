#!/usr/bin/env python3
"""Генерировать картинку для поста через Gemini"""

import json
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Для теста используем Gemini через MCP (если подключен)
# Пока просто создадим placeholder
def generate_post_image(post_text: str) -> str:
    """Генерировать картинку для поста"""
    
    # Описание для картинки
    prompt = f"""Создай картинку для Telegram поста про вейп-бренд Podonki.
Текст поста: {post_text[:100]}...

Картинка должна быть:
- Современная, молодёжная (16-23 лет)
- Яркие цвета, минимализм
- Вейп pod-система Podonki Classic или Pro в центре
- Фон с градиентом или абстрактными элементами
- Размер: 1200x628px (для Telegram)
- Текста НЕ должно быть на картинке"""
    
    # Сохранить для последующего использования через ComfyUI или Gemini API
    image_info = {
        "post_id": "post_20260314_product",
        "prompt": prompt,
        "status": "ready_for_generation",
        "service": "gemini_or_comfyui"
    }
    
    image_file = Path('data/post_image_request.json')
    with open(image_file, 'w', encoding='utf-8') as f:
        json.dump(image_info, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Запрос на картинку сохранён: {prompt[:80]}...")
    print(f"📸 Файл: {image_file}")
    print(f"⏳ Можно сгенерировать через ComfyUI (localhost:8188) или Gemini API")

if __name__ == '__main__':
    post_text = "Выбираешь первый вейп? Вот что нужно знать..."
    generate_post_image(post_text)
