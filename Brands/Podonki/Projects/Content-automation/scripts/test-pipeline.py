"""
Тест полного пайплайна: короткий промпт → улучшение → генерация → NLP анализ
Без внешних API — всё локально (NLP) + Claude (генерация через CLI)
"""

import json
import subprocess
import sys
from pathlib import Path

# === ШАГ 1: Короткий промпт от пользователя ===
user_prompt = "Напиши пост про Podonki Critical 60мг для тех кому мало крепости"

print("=" * 60)
print("🔹 ШАГ 1: Исходный промпт")
print("=" * 60)
print(f"\n{user_prompt}\n")

# === ШАГ 2: Расширение промпта (используем Fabric improve_prompt паттерн) ===
print("=" * 60)
print("🔹 ШАГ 2: Расширение промпта через Fabric improve_prompt")
print("=" * 60)

# Читаем Fabric паттерн
fabric_pattern = Path.home() / ".config/fabric/patterns/improve_prompt/system.md"
if fabric_pattern.exists():
    system_prompt = fabric_pattern.read_text(encoding="utf-8")
else:
    system_prompt = "You are an expert prompt engineer. Improve the following prompt to be more detailed and effective."

# Расширяем промпт вручную с контекстом бренда
expanded_prompt = f"""Ты — копирайтер вейп-бренда "Подонки" (Podonki). Пишешь посты для Telegram-канала.

## Задача
{user_prompt}

## Контекст бренда
- ЦА: парни 16–23, вейперы
- Тон: дерзкий, провокационный, с юмором, без канцелярита
- Формат: HTML (весь пост в <i>, заголовок в <b>, эмоджи-буллеты)
- Длина: 1000–1500 символов с пробелами
- Подход: через боли ЦА → решение через продукт
- Крепость писать "60 мг" (русскими), не "60mg"

## О продукте
- Podonki Critical — линейка для опытных вейперов
- 60 мг крепости — максимальная в линейке
- Боль ЦА: "50 мг уже не чувствую", "хочу жёстче", "привык к крепкому"

## Стиль текста
- Короткие предложения, рубленые фразы
- Молодёжный сленг (в меру)
- НЕ использовать: "уникальный", "инновационный", "в данном контексте"
- НЕ прямая реклама ("купи!")
- Вопрос в конце для вовлечения
- Тире короткое (–), не длинное (—)
- Нет тире после местоимений и перед "не"

## Критические правила
1. Весь пост в <i> (курсив)
2. Заголовок провокационный, в <b>
3. Никаких служебных пометок
4. Не выдумывать данные о продукте
5. "50 мг" — на русском, не "50mg"
"""

print(f"\nРасширенный промпт ({len(expanded_prompt)} символов):")
print(expanded_prompt[:500] + "...\n")

# === ШАГ 3: Генерация поста (симуляция — Claude бы сгенерировал) ===
print("=" * 60)
print("🔹 ШАГ 3: Генерация поста (пример)")
print("=" * 60)

# Пример поста который Claude бы сгенерировал
generated_post = """<i><b>50 мг уже не вставляют? Знакомо</b> 🔥

Помнишь, как первый раз затянулся крепким и аж в глазах потемнело? А сейчас 50 мг как воздух. Ноль эффекта, ноль кайфа.

Организм привык. Это нормально. Ненормально — терпеть и делать вид, что всё ок.

<b>Podonki Critical – 60 мг</b>

Для тех, кто перерос стандартную крепость. Не для новичков, не для экспериментов. Для тех, кто знает, чего хочет.

✌️ <b>Почему Critical</b>
• 60 мг – когда 50 уже не решает
• Удар с первой затяжки
• Вкус не теряется даже на такой крепости

Ты либо чувствуешь, либо нет. Critical – чувствуешь.

А ты на каком мг сидишь? 👇</i>"""

print(f"\n{generated_post}\n")
print(f"Длина: {len(generated_post)} символов")

# === ШАГ 4: NLP анализ ===
print("\n" + "=" * 60)
print("🔹 ШАГ 4: NLP анализ сгенерированного поста")
print("=" * 60)

# Убираем HTML теги для анализа
import re
clean_text = re.sub(r'<[^>]+>', '', generated_post).strip()

# 4.1 Natasha — NER + морфология
print("\n📌 4.1 Natasha (NER + морфология)")
try:
    from natasha import (
        Segmenter, MorphVocab, NewsEmbedding,
        NewsMorphTagger, NewsNERTagger, Doc
    )
    segmenter = Segmenter()
    morph_vocab = MorphVocab()
    emb = NewsEmbedding()
    morph_tagger = NewsMorphTagger(emb)
    ner_tagger = NewsNERTagger(emb)

    doc = Doc(clean_text)
    doc.segment(segmenter)
    doc.tag_morph(morph_tagger)
    doc.tag_ner(ner_tagger)

    print(f"  Предложений: {len(doc.sents)}")
    avg_sent_len = sum(len(s.text) for s in doc.sents) / len(doc.sents)
    print(f"  Средняя длина предложения: {avg_sent_len:.0f} символов")

    if doc.spans:
        print(f"  Найденные сущности (NER):")
        for span in doc.spans:
            span.normalize(morph_vocab)
            print(f"    - {span.text} ({span.type}): {span.normal}")
    else:
        print("  Сущности: не найдены")
except Exception as e:
    print(f"  Ошибка: {e}")

# 4.2 pymorphy3 — морфология
print("\n📌 4.2 pymorphy3 (морфология ключевых слов)")
try:
    import pymorphy3
    morph = pymorphy3.MorphAnalyzer()

    keywords = ['подонки', 'критикал', 'крепость', 'вейпер', 'затяжка', 'кайф']
    for word in keywords:
        parsed = morph.parse(word)[0]
        print(f"  {word} → {parsed.normal_form} ({parsed.tag.POS}, {parsed.score:.2f})")
except Exception as e:
    print(f"  Ошибка: {e}")

# 4.3 spaCy — NLP pipeline
print("\n📌 4.3 spaCy ru (NLP pipeline)")
try:
    import spacy
    nlp = spacy.load("ru_core_news_md")
    doc_spacy = nlp(clean_text)

    # POS distribution
    pos_counts: dict[str, int] = {}
    for token in doc_spacy:
        pos = token.pos_
        pos_counts[pos] = pos_counts.get(pos, 0) + 1

    total_tokens = len(doc_spacy)
    print(f"  Токенов: {total_tokens}")
    print(f"  Частоте частей речи:")
    for pos, count in sorted(pos_counts.items(), key=lambda x: -x[1])[:8]:
        print(f"    {pos}: {count} ({count/total_tokens*100:.0f}%)")

    # Entities
    ents = [(e.text, e.label_) for e in doc_spacy.ents]
    if ents:
        print(f"  Сущности: {ents}")
except Exception as e:
    print(f"  Ошибка: {e}")

# 4.4 Sentiment через ruBERT
print("\n📌 4.4 Sentiment (ruBERT)")
try:
    from transformers import pipeline as hf_pipeline
    sentiment = hf_pipeline(
        "sentiment-analysis",
        model="blanchefort/rubert-base-cased-sentiment",
        device=-1
    )
    # Анализируем по предложениям
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', clean_text) if s.strip() and len(s.strip()) > 5]
    results = sentiment(sentences[:10])  # первые 10 предложений

    pos = sum(1 for r in results if r['label'] == 'POSITIVE')
    neg = sum(1 for r in results if r['label'] == 'NEGATIVE')
    neu = sum(1 for r in results if r['label'] == 'NEUTRAL')

    print(f"  Предложений проанализировано: {len(results)}")
    print(f"  Positive: {pos}, Negative: {neg}, Neutral: {neu}")
    print(f"  Общий тон: {'позитивный' if pos > neg else 'негативный' if neg > pos else 'нейтральный'}")

    print(f"\n  Детали:")
    for sent, res in zip(sentences[:10], results):
        print(f"    [{res['label'][:3]} {res['score']:.2f}] {sent[:60]}...")
except Exception as e:
    print(f"  Ошибка: {e}")

# === ШАГ 5: Метрики качества ===
print("\n" + "=" * 60)
print("🔹 ШАГ 5: Метрики качества поста")
print("=" * 60)

# Длина
length = len(generated_post)
length_ok = 1000 <= length <= 1500
print(f"  Длина: {length} символов {'✅' if length_ok else '❌'} (цель: 1000-1500)")

# HTML формат
has_italic = generated_post.startswith('<i>') and generated_post.endswith('</i>')
has_bold_title = '<b>' in generated_post.split('\n')[0]
print(f"  Весь пост в <i>: {'✅' if has_italic else '❌'}")
print(f"  Заголовок в <b>: {'✅' if has_bold_title else '❌'}")

# Запрещённые слова
forbidden = ['уникальный', 'инновационный', 'в данном контексте', 'купи', '50mg', '60mg']
found_forbidden = [w for w in forbidden if w.lower() in clean_text.lower()]
print(f"  Запрещённые слова: {'❌ ' + str(found_forbidden) if found_forbidden else '✅ нет'}")

# Вопрос в конце
has_question = '?' in generated_post[-100:]
print(f"  Вопрос в конце: {'✅' if has_question else '❌'}")

# Тире
has_long_dash = '—' in generated_post
print(f"  Длинное тире (—): {'❌ заменить на –' if has_long_dash else '✅ нет'}")

# Крепость на русском
has_latin_mg = bool(re.search(r'\d+mg', generated_post))
print(f"  Латинское 'mg': {'❌' if has_latin_mg else '✅ нет'}")

# Эмоджи
emojis = re.findall(r'[\U0001F300-\U0001FAFF]', generated_post)
print(f"  Эмоджи: {len(emojis)} шт ({emojis})")

print("\n✅ Пайплайн завершён!")
