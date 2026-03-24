#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Анализатор постов Podonki — v2
Проверяет соответствие Voice Guide, System Prompts и тону бренда.
Источник правил: VOICE_GUIDE_UPDATES.md, PODONKI_OFF_TONE_ANALYSIS.md, SYSTEM_PROMPTS_FINAL.md
"""

import json
import sys
import io
import re
from pathlib import Path
from collections import Counter

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ════════════════════════════════════════════════════════════════════
# ПРАВИЛА ИЗ VOICE GUIDE + SYSTEM PROMPTS
# ════════════════════════════════════════════════════════════════════

# Запрещённые слова (корпоративный шлак)
BANNED_WORDS = [
    'инновационный', 'революционный', 'уникальный', 'передовой',
    'в данном контексте', 'высочайш', 'огромный', 'премиум-сегмент',
    'проведены исследования', 'на рынке представлен', 'широкий ассортимент',
    'эксклюзивный', 'беспрецедентный', 'не имеет аналогов',
    'синергия', 'парадигма', 'оптимизация', 'имплементация',
]

# Фирменные эмодзи (единый набор для всех каналов)
# TODO: заменить на реальный набор от пользователя
BRAND_EMOJIS_SET = ['🔥', '💀', '⚡️', '✅', '➖', '🧪', '❗️', '💯', '😎', '🎁', '🎯']

# Фирменные фразы (из анализа 192 постов)
BRAND_PHRASES = {
    'podonki_off': [
        'только белые продукты', 'only white', 'skull', 'конструктор',
        'легальн', 'белый продукт', 'документ', 'сертификат',
    ],
    'train_lab': [
        'train lab', 'партнёр', 'магазин', 'маржа', 'оборот',
        'витрина', 'клиент', 'закупщик',
    ],
    'b2c': [
        'podonki', 'подонки', 'вкус', 'кайф', 'зашёл', 'офигеть',
        'норм', 'попробуй', 'согласен',
    ],
}

# Женские / неподходящие слова (ЦА — мужчины 18-30)
FEMALE_WORDS = [
    'красивая', 'прелесть', 'королева', 'принцесса', 'девочка',
    'милая', 'нежная', 'гламурн', 'розовая', 'мечта девушки',
    'для неё', 'подарок ей', 'женственн',
]

# Casual-слова (маркер правильного тона)
CASUAL_MARKERS = [
    'зашёл', 'зашел', 'офигеть', 'норм', 'прикольн', 'кайф',
    'круто', 'чётко', 'четко', 'огонь', 'топ', 'жёстк', 'жестк',
    'реально', 'вообще', 'короче', 'блин', 'ваще', 'збс', 'лол',
    'кринж', 'вайб', 'зашибис', 'бомба', 'мощь', 'база',
]

# Вовлекающие элементы (вопросы, CTA)
ENGAGEMENT_PATTERNS = [
    r'\?',                          # Вопросы
    r'@\w+',                        # @упоминания менеджеров
    r'пиши|напиши|связь|заказ',     # CTA
    r'согласен|думаешь|попробуй',   # Вовлечение
    r'ссылк|бот|канал',             # Ссылки
]

# Структурные элементы (из System Prompts)
STRUCTURE_MARKERS = {
    'has_title': r'^[A-ZА-ЯЁ\s\d:]{3,}',  # Заголовок CAPS или название товара
    'has_list': r'[➖—\-•]\s',              # Список с маркерами
    'has_cta': r'@\w+|пиши|связь|заказ|менеджер',  # CTA / контакт
    'has_paragraphs': r'\n\n',              # Разделение абзацами
}


# ════════════════════════════════════════════════════════════════════
# АНАЛИЗАТОР
# ════════════════════════════════════════════════════════════════════

def detect_channel(text: str, channel_hint: str = '') -> str:
    """Определить тип канала по контенту или hint"""
    hint = channel_hint.lower()
    if 'off' in hint or 'skull' in hint:
        return 'podonki_off'
    if 'train' in hint or 'lab' in hint or 'b2b' in hint:
        return 'train_lab'
    if 'b2c' in hint or 'podonki' in hint:
        return 'b2c'

    # Автодетект по контенту
    lower = text.lower()
    if 'skull' in lower or 'только белые' in lower or 'конструктор' in lower:
        return 'podonki_off'
    if 'train lab' in lower or 'партнёр' in lower or 'магазин' in lower:
        return 'train_lab'
    return 'b2c'


def analyze_post(text: str, channel_hint: str = '') -> dict:
    """Полный анализ одного поста"""
    channel = detect_channel(text, channel_hint)
    lower = text.lower()
    lines = text.strip().split('\n')
    words = lower.split()

    result = {
        'text_preview': text[:120] + '...' if len(text) > 120 else text,
        'channel': channel,
        'length': len(text),
        'word_count': len(words),
        'score': 100,
        'issues': [],
        'strengths': [],
        'checks': {},
    }

    # ─── 1. ЗАПРЕЩЁННЫЕ СЛОВА ───
    found_banned = [w for w in BANNED_WORDS if w in lower]
    result['checks']['banned_words'] = found_banned
    if found_banned:
        penalty = len(found_banned) * 15
        result['score'] -= penalty
        result['issues'].append(f'Корпоративные слова: {", ".join(found_banned)} (-{penalty})')

    # ─── 2. ЖЕНСКИЕ СЛОВА ───
    found_female = [w for w in FEMALE_WORDS if w in lower]
    result['checks']['female_words'] = found_female
    if found_female:
        penalty = len(found_female) * 10
        result['score'] -= penalty
        result['issues'].append(f'Женские формулировки: {", ".join(found_female)} (-{penalty})')

    # ─── 3. ДЛИНА ПОСТА (целевая: 1000-1500 символов) ───
    if len(text) < 300:
        result['score'] -= 20
        result['issues'].append(f'Слишком короткий ({len(text)} символов, нужно 1000-1500)')
    elif len(text) < 1000:
        result['score'] -= 10
        result['issues'].append(f'Короткий ({len(text)} символов, нужно 1000-1500)')
    elif len(text) > 1500:
        result['score'] -= 5
        result['issues'].append(f'Длинноват ({len(text)} символов, цель 1000-1500)')
    else:
        result['strengths'].append(f'Длина идеальная ({len(text)} символов)')

    # ─── 4. ПОВТОРЕНИЯ СЛОВ ───
    significant_words = [w for w in words if len(w) > 4]
    freq = Counter(significant_words)
    repeats = {w: c for w, c in freq.items() if c > 3}
    result['checks']['word_repeats'] = repeats
    if repeats:
        penalty = sum((c - 3) * 3 for c in repeats.values())
        result['score'] -= penalty
        top = ', '.join(f'"{w}" ({c}x)' for w, c in list(repeats.items())[:3])
        result['issues'].append(f'Повторения: {top} (-{penalty})')

    # ─── 5. CASUAL TONE ───
    found_casual = [w for w in CASUAL_MARKERS if w in lower]
    result['checks']['casual_markers'] = found_casual
    if found_casual:
        result['strengths'].append(f'Casual тон: {", ".join(found_casual[:3])}')
    else:
        if channel == 'b2c':
            result['score'] -= 10
            result['issues'].append('Нет casual-слов (для B2C обязательно)')
        elif channel in ('train_lab', 'podonki_off'):
            result['score'] -= 5
            result['issues'].append('Мало casual-слов (тон слишком формальный)')

    # ─── 6. ФИРМЕННЫЕ ЭМОДЗИ ───
    all_emoji = re.findall(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0000FE00-\U0000FE0F\U0001FA00-\U0001FAFF]', text)
    found_brand_emoji = [e for e in BRAND_EMOJIS_SET if e in text]
    result['checks']['emojis'] = {'total': len(all_emoji), 'brand': found_brand_emoji}

    if not all_emoji:
        result['score'] -= 5
        result['issues'].append('Нет эмодзи (рекомендуются фирменные)')
    elif found_brand_emoji:
        result['strengths'].append(f'Фирменные эмодзи: {" ".join(found_brand_emoji)}')
    elif len(all_emoji) > 10:
        result['score'] -= 5
        result['issues'].append('Слишком много эмодзи (>10, выглядит спамом)')

    # ─── 7. СТРУКТУРА ПОСТА ───
    has_title = bool(re.match(STRUCTURE_MARKERS['has_title'], lines[0])) if lines else False
    has_list = bool(re.search(STRUCTURE_MARKERS['has_list'], text))
    has_cta = bool(re.search(STRUCTURE_MARKERS['has_cta'], lower))
    has_paragraphs = bool(re.search(STRUCTURE_MARKERS['has_paragraphs'], text))

    result['checks']['structure'] = {
        'has_title': has_title,
        'has_list': has_list,
        'has_cta': has_cta,
        'has_paragraphs': has_paragraphs,
    }

    structure_score = sum([has_title, has_list, has_cta, has_paragraphs])
    if structure_score >= 3:
        result['strengths'].append('Хорошая структура (заголовок + список + CTA)')
    elif structure_score <= 1:
        result['score'] -= 10
        missing = []
        if not has_title:
            missing.append('заголовок')
        if not has_cta:
            missing.append('CTA/@менеджер')
        if not has_paragraphs:
            missing.append('абзацы')
        result['issues'].append(f'Слабая структура, нет: {", ".join(missing)}')

    # ─── 8. ВОВЛЕЧЕНИЕ ───
    engagement_hits = sum(1 for p in ENGAGEMENT_PATTERNS if re.search(p, lower))
    result['checks']['engagement'] = engagement_hits
    if engagement_hits >= 2:
        result['strengths'].append('Хорошее вовлечение (вопросы, CTA)')
    elif engagement_hits == 0:
        result['score'] -= 5
        result['issues'].append('Нет вовлечения (ни вопросов, ни CTA)')

    # ─── 9. ФИРМЕННЫЕ ФРАЗЫ ───
    phrases = BRAND_PHRASES.get(channel, [])
    found_phrases = [p for p in phrases if p in lower]
    result['checks']['brand_phrases'] = found_phrases
    if found_phrases:
        result['strengths'].append(f'Фирменные фразы: {", ".join(found_phrases[:3])}')

    # ─── 10. ПРЕДЛОЖЕНИЯ (длина) ───
    sentences = re.split(r'[.!?\n]+', text)
    long_sentences = [s.strip() for s in sentences if len(s.strip()) > 100]
    if long_sentences:
        result['score'] -= len(long_sentences) * 5
        result['issues'].append(f'Длинные предложения ({len(long_sentences)}шт >100 символов)')

    # Ограничиваем 0-100
    result['score'] = max(0, min(100, result['score']))

    return result


def grade(score: int) -> str:
    """Оценка в букву"""
    if score >= 90:
        return 'A'
    if score >= 75:
        return 'B'
    if score >= 60:
        return 'C'
    if score >= 40:
        return 'D'
    return 'F'


def print_analysis(analysis: dict, idx: int):
    """Вывод анализа одного поста"""
    s = analysis['score']
    g = grade(s)
    icon = '✅' if s >= 75 else '⚠️' if s >= 50 else '❌'

    print(f'\n{icon} Пост {idx} [{g}] {s}/100 ({analysis["channel"]})')
    print(f'   {analysis["text_preview"]}')

    if analysis['issues']:
        for issue in analysis['issues']:
            print(f'   ❗ {issue}')

    if analysis['strengths']:
        for strength in analysis['strengths']:
            print(f'   ✓ {strength}')


def analyze_file(file_path: str | Path) -> list[dict]:
    """Анализ файла с постами"""
    path = Path(file_path)
    if not path.exists():
        print(f'Файл не найден: {path}')
        return []

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    results = []

    # Поддержка разных форматов
    if isinstance(data, list):
        for channel_data in data:
            channel = channel_data.get('channel', channel_data.get('name', ''))
            posts = channel_data.get('posts', [])
            for post in posts:
                text = post.get('text', post) if isinstance(post, dict) else post
                if text:
                    results.append(analyze_post(str(text), channel))

    elif isinstance(data, dict):
        # Формат: {channel: [posts]}
        for channel, posts in data.items():
            if isinstance(posts, list):
                for post in posts:
                    text = post.get('text', post) if isinstance(post, dict) else post
                    if text:
                        results.append(analyze_post(str(text), channel))

    return results


def print_summary(results: list[dict]):
    """Сводная статистика"""
    if not results:
        print('\nНет постов для анализа')
        return

    scores = [r['score'] for r in results]
    avg = sum(scores) / len(scores)

    # По каналам
    channels: dict[str, list] = {}
    for r in results:
        ch = r['channel']
        channels.setdefault(ch, []).append(r['score'])

    # Частые проблемы
    all_issues: list[str] = []
    for r in results:
        all_issues.extend(r['issues'])

    issue_types = Counter(all_issues)

    print(f'\n{"="*60}')
    print(f'  СВОДКА АНАЛИЗА')
    print(f'{"="*60}')
    print(f'  Постов: {len(results)}')
    print(f'  Средняя оценка: {avg:.0f}/100 [{grade(int(avg))}]')
    print(f'  A (90+): {sum(1 for s in scores if s >= 90)}')
    print(f'  B (75-89): {sum(1 for s in scores if 75 <= s < 90)}')
    print(f'  C (60-74): {sum(1 for s in scores if 60 <= s < 75)}')
    print(f'  D/F (<60): {sum(1 for s in scores if s < 60)}')

    if channels:
        print(f'\n  По каналам:')
        for ch, ch_scores in channels.items():
            ch_avg = sum(ch_scores) / len(ch_scores)
            print(f'    {ch}: {ch_avg:.0f}/100 ({len(ch_scores)} постов)')

    if issue_types:
        print(f'\n  Топ проблемы:')
        for issue, count in issue_types.most_common(5):
            print(f'    [{count}x] {issue}')

    print(f'{"="*60}')


def main():
    print('\n' + '='*60)
    print('  PODONKI POST ANALYZER v2')
    print('='*60)

    scripts_dir = Path(__file__).parent
    project_dir = scripts_dir.parent

    # Ищем файлы с постами
    search_paths = [
        scripts_dir / 'posts-data.json',
        project_dir / 'data' / 'ПостыПodonki_Сырые.json',
        project_dir / 'data' / 'ПостыПodonki_Примеры.json',
    ]

    all_results: list[dict] = []

    for path in search_paths:
        if path.exists():
            print(f'\n📂 Анализ: {path.name}')
            results = analyze_file(path)
            all_results.extend(results)
            for i, r in enumerate(results, 1):
                print_analysis(r, i)

    # Если ничего нет — демо с примерами
    if not all_results:
        print('\nФайлы с постами не найдены, запускаю демо...\n')
        demo_posts = [
            ('Podonki OFF: ТОЛЬКО БЕЛЫЕ ПРОДУКТЫ 💀\n\n'
             'Конструктор табака — легальный бизнес.\n'
             'Документы есть, сертификаты есть.\n\n'
             '➖ Маржа выше чем на жиже\n'
             '➖ Клиент возвращается\n'
             '➖ Нет проблем с законом\n\n'
             'По вопросам @SKULL_manageer', 'podonki_off'),

            ('Last Hap: 50мг, 40 вкусов\n\n'
             'Партнёры спрашивают: как привлечь клиентов?\n\n'
             'Ответ: 40 вкусов = 40 причин вернуться.\n'
             'Маржа норм, оборот быстро.\n\n'
             '➖ Выставь рядом\n'
             '➖ Рекомендуй "попробуй новый"\n\n'
             'По вопросам @TRAIN_LAB_manager', 'train_lab'),

            ('Зашёл новый вкус и это просто огонь 🔥\n\n'
             'Клубника-банан от Podonki.\n'
             'Кто пробовал — тот не вернётся к старому.\n\n'
             'Согласен или нет? Пиши в комменты 👇', 'b2c'),

            ('Представляем инновационный продукт нашей уникальной линейки. '
             'Данное решение не имеет аналогов на рынке и обеспечивает '
             'высочайшее качество вейпинга.', 'b2c'),

            ('вкусно', 'b2c'),
        ]

        for i, (text, channel) in enumerate(demo_posts, 1):
            r = analyze_post(text, channel)
            all_results.append(r)
            print_analysis(r, i)

    # Сводка
    print_summary(all_results)

    # Сохранение
    output_path = scripts_dir / 'analysis-result.json'
    output = {
        'version': '2.0',
        'total_posts': len(all_results),
        'avg_score': round(sum(r['score'] for r in all_results) / len(all_results), 1) if all_results else 0,
        'posts': all_results,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'\n💾 Результат: {output_path}')


if __name__ == '__main__':
    main()
