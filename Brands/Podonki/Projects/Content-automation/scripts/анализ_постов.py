#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Анализ постов канала Podonki B2C
Выявляет ER, типы контента, тон, какие рубрики работают лучше
"""

import json
import re
import sys
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any

# Правильная кодировка для Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def load_posts(filepath: str) -> List[Dict]:
    """Загружает посты из JSON"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('messages', [])

def extract_text(message: Dict) -> str:
    """Извлекает текст из сложной структуры"""
    text_entities = message.get('text', [])

    if isinstance(text_entities, str):
        return text_entities

    if isinstance(text_entities, list):
        parts = []
        for entity in text_entities:
            if isinstance(entity, str):
                parts.append(entity)
            elif isinstance(entity, dict) and 'text' in entity:
                parts.append(entity['text'])
        return ''.join(parts)

    return ''

def get_engagement_metrics(message: Dict) -> Dict:
    """Извлекает метрики вовлечения"""
    return {
        'views': message.get('views', 0),
        'forwards': message.get('forwards', 0),
        'replies': message.get('replies', 0),
    }

def calculate_er(views: int, forwards: int, replies: int) -> float:
    """ER = (forwards + replies) / views * 100"""
    if views == 0:
        return 0
    return ((forwards + replies) / views * 100) if views > 0 else 0

def detect_content_type(text: str, message: Dict) -> str:
    """Определяет тип контента"""
    text_lower = text.lower()

    # Видео
    if message.get('media_type') == 'video_file':
        return 'видео'

    # Картинка
    if message.get('media_type') == 'photo':
        return 'фото'

    # Мем/развлечение (признаки)
    if any(word in text_lower for word in ['мем', 'смешно', 'кринж', 'vs', 'челлендж', 'вызов']):
        return 'мем/развлечение'

    # Опрос/вопрос
    if '?' in text or 'думаешь' in text_lower or 'согласен' in text_lower:
        return 'вопрос/опрос'

    # Лайфхак
    if any(word in text_lower for word in ['как', 'совет', 'лайфхак', 'трюк', 'способ', 'способ']):
        return 'лайфхак'

    # Обзор/сравнение
    if any(word in text_lower for word in ['топ', 'обзор', 'рейтинг', 'сравнение', 'vs', 'лучше']):
        return 'обзор/сравнение'

    # Информация
    if any(word in text_lower for word in ['новое', 'анонс', 'новинка', 'важно', 'внимание']):
        return 'информация/анонс'

    # Розыгрыш
    if any(word in text_lower for word in ['розыгрыш', 'приз', 'выигрыш', 'челлендж', 'конкурс']):
        return 'розыгрыш/конкурс'

    return 'другое'

def detect_tone(text: str) -> str:
    """Определяет тон поста"""
    text_lower = text.lower()

    # Шутливый/дерзкий
    if any(word in text_lower for word in ['лол', 'хаха', 'мне', 'кринж', 'офигеть', 'зашибис']):
        return 'шутливый/дерзкий'

    # Информативный
    if any(word in text_lower for word in ['как', 'способ', 'метод', 'важно', 'знай']):
        return 'информативный'

    # Мотивирующий
    if any(word in text_lower for word in ['лучше', 'помогает', 'успех', 'получилось', 'попробуй']):
        return 'мотивирующий'

    # Вопрошающий
    if text.count('?') >= 1:
        return 'вопрошающий'

    return 'нейтральный'

def analyze_posts(posts: List[Dict]) -> Dict[str, Any]:
    """Анализирует все посты и выдаёт статистику"""

    stats = {
        'total_posts': 0,
        'posts_with_metrics': 0,
        'avg_er': 0,
        'high_er_posts': [],  # ER > 3%
        'low_er_posts': [],   # ER < 1%
        'content_types': defaultdict(list),
        'tones': defaultdict(int),
        'posts_by_date': defaultdict(int),
    }

    er_list = []

    # Фильтруем только обычные сообщения (не служебные)
    regular_posts = [m for m in posts if m.get('type') == 'message']
    stats['total_posts'] = len(regular_posts)

    for post in regular_posts:
        text = extract_text(post)

        # Пропускаем пустые посты
        if not text or len(text.strip()) < 10:
            continue

        metrics = get_engagement_metrics(post)
        views = metrics['views']

        # Пропускаем посты без метрик (слишком новые)
        if views == 0:
            continue

        stats['posts_with_metrics'] += 1

        # Рассчитываем ER
        er = calculate_er(views, metrics['forwards'], metrics['replies'])
        er_list.append(er)

        # Определяем тип и тон
        content_type = detect_content_type(text, post)
        tone = detect_tone(text)

        # Сохраняем пост с анализом
        post_analysis = {
            'id': post.get('id'),
            'date': post.get('date'),
            'text': text[:100] + '...' if len(text) > 100 else text,
            'views': views,
            'forwards': metrics['forwards'],
            'replies': metrics['replies'],
            'er': round(er, 2),
            'content_type': content_type,
            'tone': tone,
        }

        # Сортируем по ER
        if er > 3:
            stats['high_er_posts'].append(post_analysis)
        elif er < 1:
            stats['low_er_posts'].append(post_analysis)

        stats['content_types'][content_type].append(post_analysis)
        stats['tones'][tone] += 1

        # Группируем по датам
        date_str = post.get('date', '').split('T')[0]
        if date_str:
            stats['posts_by_date'][date_str] += 1

    # Вычисляем средний ER
    if er_list:
        stats['avg_er'] = round(sum(er_list) / len(er_list), 2)

    # Сортируем высокоER посты
    stats['high_er_posts'].sort(key=lambda x: x['er'], reverse=True)
    stats['low_er_posts'].sort(key=lambda x: x['er'])

    return stats

def generate_report(stats: Dict[str, Any]) -> str:
    """Генерирует отчёт"""
    report = f"""
# АНАЛИЗ ПОСТОВ КАНАЛА PODONKI B2C

## Общая статистика
- **Всего постов:** {stats['total_posts']}
- **Постов с метриками:** {stats['posts_with_metrics']}
- **Средний ER:** {stats['avg_er']}%

## Распределение по типам контента
"""

    for content_type, posts in sorted(stats['content_types'].items(),
                                      key=lambda x: len(x[1]),
                                      reverse=True):
        avg_er = sum(p['er'] for p in posts) / len(posts) if posts else 0
        report += f"\n### {content_type}\n"
        report += f"- **Количество:** {len(posts)}\n"
        report += f"- **Средний ER:** {round(avg_er, 2)}%\n"
        report += f"- **Примеры:**\n"
        for post in posts[:3]:
            report += f"  - \"{post['text'][:60]}...\" (ER: {post['er']}%)\n"

    report += f"""
## Распределение по тону
"""
    for tone, count in sorted(stats['tones'].items(), key=lambda x: x[1], reverse=True):
        report += f"- **{tone}:** {count} постов\n"

    report += f"""
## Топ постов по ER (> 3%)
"""
    for post in stats['high_er_posts'][:5]:
        report += f"""- **ER: {post['er']}%** | {post['content_type']} | {post['tone']}
  - \"{post['text'][:80]}...\"
  - views: {post['views']}, forwards: {post['forwards']}, replies: {post['replies']}
"""

    return report

def main():
    # Загружаем посты
    posts = load_posts('data/ПостыПodonki_Сырые.json')
    print(f"Загружено {len(posts)} постов...")

    # Анализируем
    stats = analyze_posts(posts)

    # Генерируем отчёт
    report = generate_report(stats)
    print(report)

    # Сохраняем анализ в JSON
    analysis_output = {
        'summary': {
            'total_posts': stats['total_posts'],
            'posts_with_metrics': stats['posts_with_metrics'],
            'avg_er': stats['avg_er'],
        },
        'content_types': {
            ct: {
                'count': len(posts),
                'avg_er': round(sum(p['er'] for p in posts) / len(posts), 2),
                'top_posts': posts[:3]
            }
            for ct, posts in stats['content_types'].items()
        },
        'tones': stats['tones'],
        'high_er_posts': stats['high_er_posts'][:10],
        'low_er_posts': stats['low_er_posts'][:5],
    }

    with open('data/ПостыПodonki_Анализ.json', 'w', encoding='utf-8') as f:
        json.dump(analysis_output, f, ensure_ascii=False, indent=2)

    print("\n✅ Анализ сохранён в data/ПостыПodonki_Анализ.json")

if __name__ == '__main__':
    main()
