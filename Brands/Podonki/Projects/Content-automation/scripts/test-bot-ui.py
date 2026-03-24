#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import sys
from pathlib import Path

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_DIR = Path('data')

def show_bot_interface():
    """Демонстрация интерфейса модератора"""
    
    queue_file = DATA_DIR / 'очередь_модерации.json'
    with open(queue_file, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    post = posts[0]
    variant = post['selected_variant']
    
    print("\n" + "="*70)
    print("Модератор постов PODONKI (интерфейс)")
    print("="*70)
    
    print("\nГЛАВНОЕ МЕНЮ:")
    print("[📋 Модерировать посты]")
    print("[✍ Напиши пост]")
    print("[📌 Пост по тезисам]")
    print("[📊 Статистика]")
    print("[❓ Справка]")
    
    print("\n" + "="*70)
    print("Выбран: Модерировать посты")
    print("="*70)
    
    print(f"\nВариант 1/1\n")
    print(f"Текст: {variant['text']}\n")
    print(f"Рубрика: {post['rubric']}")
    print(f"Тон: {post['tone']}")
    print(f"Score: {variant['score']}\n")
    
    print("[✅ Принять]")
    print("[✏ Редактировать]")
    print("[❌ Отказать всё]")
    
    print("\n" + "="*70)
    print("СОХРАНЕНЫ ФАЙЛЫ:")
    print("="*70)
    
    files_to_check = [
        ('config/БрендКонфиг.json', 'Конфиг продукции'),
        ('data/очередь_модерации.json', 'Пост готов к модерации'),
        ('data/модель_рейтинги.json', 'Будет создан при принятии'),
        ('data/решения_модерации.json', 'Будет создан после решения'),
        ('data/глобальные_правила.json', 'Будет создан при добавлении правила'),
    ]
    
    for filepath, status in files_to_check:
        file_path = Path(filepath)
        exists = "OK" if file_path.exists() else "TODO"
        print(f"[{exists}] {filepath} - {status}")
    
    print("\n" + "="*70)
    print("СЛЕДУЮЩИЕ ШАГИ:")
    print("="*70)
    print("""
1. Запустить бота: python scripts/moderation_bot.py
2. В Telegram: /start
3. Нажать "Модерировать посты"
4. Выбрать действие:
   - Принять (пост в очередь публикации)
   - Редактировать (отправить исправленный текст)
   - Отказать (пост удаляется)
5. После принятия обновятся рейтинги моделей
""")

if __name__ == '__main__':
    show_bot_interface()
