#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Bot для модерации постов Podonki
Показывает 5 вариантов поста, принимает/отказывает, анализирует корректировки
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import asyncio

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Пути к файлам
DATA_DIR = Path('data')
CONFIG_DIR = Path('config')

class PostModerator:
    """Модератор постов в Telegram"""

    def __init__(self):
        self.current_post = None
        self.current_variants = []
        self.user_edits = {}

    def load_post_variants(self) -> Dict:
        """Загрузить варианты из очереди на модерацию"""
        queue_file = DATA_DIR / 'очередь_модерации.json'
        if queue_file.exists():
            with open(queue_file, 'r', encoding='utf-8') as f:
                posts = json.load(f)
                # Если это массив постов, берём первый
                if isinstance(posts, list):
                    if posts:
                        post = posts[0]
                        variants = [post['selected_variant']] + post.get('other_variants', [])
                        return {
                            "post_id": post['post_id'],
                            "variants": variants,
                            "post_data": post  # Сохраняем полные данные поста
                        }
                    return {"variants": [], "post_id": None, "post_data": {}}
                # Иначе это уже структурированный словарь
                return posts
        return {"variants": [], "post_id": None, "post_data": {}}

    def save_decision(self, post_id: str, decision: str, variant_text: Optional[str] = None, selected_model: Optional[str] = None):
        """Сохранить решение (принял/отказ) и обновить рейтинги моделей"""
        decision_file = DATA_DIR / 'решения_модерации.json'

        decision_obj = {
            "post_id": post_id,
            "decision": decision,
            "variant_text": variant_text,
            "decided_at": datetime.now().isoformat(),
            "selected_model": selected_model
        }

        decisions = []
        if decision_file.exists():
            with open(decision_file, 'r', encoding='utf-8') as f:
                decisions = json.load(f)

        decisions.append(decision_obj)

        with open(decision_file, 'w', encoding='utf-8') as f:
            json.dump(decisions, f, ensure_ascii=False, indent=2)

    def analyze_edit(self, original: str, edited: str) -> Dict:
        """Анализировать что изменил пользователь"""
        analysis = {
            "original_length": len(original),
            "edited_length": len(edited),
            "length_change": len(edited) - len(original),
            "changes": []
        }

        # Простой анализ изменений
        original_words = set(original.split())
        edited_words = set(edited.split())

        added = edited_words - original_words
        removed = original_words - edited_words

        if added:
            analysis["changes"].append({
                "type": "added_words",
                "words": list(added)[:5]
            })

        if removed:
            analysis["changes"].append({
                "type": "removed_words",
                "words": list(removed)[:5]
            })

        return analysis

    def save_edit_analysis(self, post_id: str, original: str, edited: str):
        """Сохранить анализ редактирования"""
        analysis = self.analyze_edit(original, edited)

        edits_file = DATA_DIR / 'анализ_редактирования.json'

        edit_obj = {
            "post_id": post_id,
            "original": original,
            "edited": edited,
            "analysis": analysis,
            "edited_at": datetime.now().isoformat()
        }

        edits = []
        if edits_file.exists():
            with open(edits_file, 'r', encoding='utf-8') as f:
                edits = json.load(f)

        edits.append(edit_obj)

        with open(edits_file, 'w', encoding='utf-8') as f:
            json.dump(edits, f, ensure_ascii=False, indent=2)

    def update_model_ratings(self, winning_model: str):
        """Обновить рейтинги моделей после одобрения"""
        ratings_file = DATA_DIR / 'модель_рейтинги.json'

        ratings = {}
        if ratings_file.exists():
            with open(ratings_file, 'r', encoding='utf-8') as f:
                ratings = json.load(f)

        if winning_model not in ratings:
            ratings[winning_model] = {'wins': 0, 'losses': 0, 'rate': 0.5}

        # Winning model gets a win
        ratings[winning_model]['wins'] = ratings[winning_model].get('wins', 0) + 1

        # All other models get a loss
        for model in ratings:
            if model != winning_model:
                ratings[model]['losses'] = ratings[model].get('losses', 0) + 1

        # Recalculate rates
        for model in ratings:
            total = ratings[model]['wins'] + ratings[model]['losses']
            if total > 0:
                ratings[model]['rate'] = ratings[model]['wins'] / total
            else:
                ratings[model]['rate'] = 0.5

        with open(ratings_file, 'w', encoding='utf-8') as f:
            json.dump(ratings, f, ensure_ascii=False, indent=2)

moderator = PostModerator()

# ========== HANDLERS ==========

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start"""
    keyboard = [
        [InlineKeyboardButton("📋 Модерировать посты", callback_data='moderate')],
        [InlineKeyboardButton("✍️ Напиши пост", callback_data='write_post')],
        [InlineKeyboardButton("📌 Пост по тезисам", callback_data='write_by_thesis')],
        [InlineKeyboardButton("📊 Статистика", callback_data='stats')],
        [InlineKeyboardButton("❓ Справка", callback_data='help')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🤖 *Модератор постов Podonki*\n\n"
        "📋 **Модерировать** — выбирай из 5 вариантов\n"
        "✍️ **Напиши пост** — я генерирую по твоему тексту\n"
        "📌 **По тезисам** — я расширу твои ключевые пункты\n"
        "📊 **Статистика** — как идут дела\n\n"
        "_Готовые посты переводятся в очередь публикации_",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def moderate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начать модерацию"""
    query = update.callback_query
    await query.answer()

    # Загрузить очередь
    data = moderator.load_post_variants()

    if not data.get('variants'):
        await query.edit_message_text("❌ Нет постов на модерацию")
        return

    # Сохранить текущий пост в контекст
    moderator.current_post = data['post_id']
    context.user_data['current_post'] = data['post_id']
    context.user_data['current_post_data'] = data.get('post_data', {})

    # Показать ТОЛЬКО лучший вариант (первый — это selected_variant)
    best_variant = data['variants'][0] if data['variants'] else None
    if not best_variant:
        await query.edit_message_text("❌ Нет лучшего варианта")
        return

    context.user_data['current_best_variant'] = best_variant
    await show_best_variant(update, context)

async def show_best_variant(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать ТОЛЬКО лучший вариант (победитель соревнования)"""
    variant = context.user_data.get('current_best_variant', {})

    if not variant:
        await update.callback_query.edit_message_text("❌ Нет варианта для показа")
        return

    post_data = context.user_data.get('current_post_data', {})
    image_rec = post_data.get('image_recommendation', 'Требуется картинка')

    # Обрезаем текст если слишком длинный для Telegram (макс 4096 символов в сообщении)
    post_text = variant.get('text', 'Текст не найден')
    if len(post_text) > 3500:
        post_text = post_text[:3500] + '\n\n...[текст продолжается]'

    text = f"""
🏆 *ЛУЧШИЙ ВАРИАНТ* (мой выбор как судья)

📝 {post_text}

_Модель: {variant.get('model', 'не указана')}_
_Качество: {variant.get('score', 0)}/5.0_

🖼️ *Картинка:* {image_rec}
"""

    keyboard = []

    # Принять вариант
    keyboard.append([
        InlineKeyboardButton("✅ Принять и опубликовать", callback_data="accept_best")
    ])

    # Редактировать вариант
    keyboard.append([
        InlineKeyboardButton("✏️ Редактировать", callback_data="edit_best")
    ])

    # Отказать
    keyboard.append([
        InlineKeyboardButton("❌ Отказать, переделать", callback_data="reject_best")
    ])

    reply_markup = InlineKeyboardMarkup(keyboard)

    if update.callback_query:
        await update.callback_query.edit_message_text(
            text,
            parse_mode='Markdown',
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_text(
            text,
            parse_mode='Markdown',
            reply_markup=reply_markup
        )

async def accept_variant(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Принять лучший вариант"""
    query = update.callback_query
    await query.answer("✅ Принято!", show_alert=False)

    post_id = context.user_data.get('current_post')
    variant = context.user_data.get('current_best_variant', {})

    # Получить модель выигравшего варианта
    selected_model = variant.get('model', 'Unknown')

    # Сохранить решение и обновить рейтинги
    moderator.save_decision(post_id, 'accepted', variant['text'], selected_model)
    moderator.update_model_ratings(selected_model)

    # Переместить в очередь публикации
    await move_to_publishing_queue(post_id, variant['text'])

    await query.edit_message_text(
        f"✅ Пост принят и добавлен в очередь публикации!\n\n"
        f"📝 _{variant['text'][:100]}..._",
        parse_mode='Markdown'
    )

async def edit_variant(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Начать редактирование лучшего варианта"""
    query = update.callback_query

    variant = context.user_data.get('current_best_variant', {})
    context.user_data['editing_best'] = True
    context.user_data['original_text'] = variant.get('text', '')

    await query.edit_message_text(
        f"✏️ *Редактирование*\n\n"
        f"Оригинал:\n_{variant.get('text', '')}_\n\n"
        f"Отправь исправленный текст ниже 👇"
    )

async def reject_variant(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Отказать, переделать"""
    query = update.callback_query
    await query.answer("❌ Отклонено", show_alert=False)

    post_id = context.user_data.get('current_post')
    moderator.save_decision(post_id, 'rejected')

    keyboard = [
        [InlineKeyboardButton("📋 Модерировать еще", callback_data='moderate')],
        [InlineKeyboardButton("📊 Главное меню", callback_data='start')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        "❌ Пост отклонен. Будет переделан с учётом замечаний.",
        reply_markup=reply_markup
    )

async def handle_edited_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработать текст в зависимости от режима"""
    user_input = update.message.text
    mode = context.user_data.get('mode')

    # Проверить: 'write_post' или 'write_by_thesis'
    if mode in ['write_post', 'write_by_thesis']:
        await handle_write_post_text(update, context)
        return

    # Иначе это модерация
    post_id = context.user_data.get('current_post')
    original_text = context.user_data.get('original_text')

    # Проверить: это редактирование текста или комментарий к варианту?
    if context.user_data.get('editing_best'):
        # Это редактирование текста поста
        await handle_post_edit(update, context, user_input, original_text, post_id)
    else:
        # Это комментарий/критика к варианту
        await handle_feedback_comment(update, context, user_input, post_id)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка кнопок"""
    query = update.callback_query
    data = query.data

    if data == 'accept_best':
        await accept_variant(update, context)

    elif data == 'edit_best':
        await edit_variant(update, context)

    elif data == 'reject_best':
        await reject_variant(update, context)

    elif data == 'moderate':
        await moderate(update, context)

    elif data == 'write_post':
        await write_post_start(update, context)

    elif data == 'write_by_thesis':
        await write_by_thesis_start(update, context)

    elif data == 'stats':
        await show_stats(update, context)

    elif data == 'help':
        await show_help(update, context)

    elif data == 'posting_done':
        await query.answer("✅ Пост выложен, жди результатов!", show_alert=False)
        keyboard = [
            [InlineKeyboardButton("📋 Модерировать еще", callback_data='moderate')],
            [InlineKeyboardButton("📊 Главное меню", callback_data='start')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            "✅ Спасибо! Когда получишь результаты (ER, комментарии подписчиков), "
            "отправь мне — проанализирую и улучшу следующие варианты.",
            reply_markup=reply_markup
        )

async def show_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать статистику модерации"""
    query = update.callback_query

    decisions_file = DATA_DIR / 'решения_модерации.json'
    if not decisions_file.exists():
        await query.answer("Нет данных")
        return

    with open(decisions_file, 'r', encoding='utf-8') as f:
        decisions = json.load(f)

    accepted = len([d for d in decisions if d['decision'] == 'accepted'])
    edited = len([d for d in decisions if d['decision'] == 'edited'])
    rejected = len([d for d in decisions if d['decision'] == 'rejected'])

    stats_text = f"""
*📊 Статистика модерации*

✅ Принято: {accepted}
✏️ Отредактировано: {edited}
❌ Отклонено: {rejected}
📈 Всего: {accepted + edited + rejected}

Процент редактирования: {edited / max(accepted + edited, 1) * 100:.1f}%
"""

    keyboard = [
        [InlineKeyboardButton("📋 Назад", callback_data='moderate')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        stats_text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def show_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать справку"""
    query = update.callback_query

    help_text = """
*❓ Как пользоваться ботом*

1️⃣ Нажми "Модерировать посты"
2️⃣ Просмотри варианты (по одному)
3️⃣ Выбери действие:
   ✅ *Принять* — берём как есть
   ✏️ *Редактировать* — отправь исправленный текст
   ➡️ *Далее* — посмотреть другой вариант
4️⃣ Пост попадет в очередь публикации

*Команды:*
/start — главное меню
/moderate — начать модерацию
/stats — статистика

Если редактировал текст, отправь новый в одном сообщении.
"""

    keyboard = [
        [InlineKeyboardButton("📋 Назад", callback_data='moderate')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        help_text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_post_edit(update: Update, context: ContextTypes.DEFAULT_TYPE, edited_text: str, original_text: str, post_id: str):
    """Обработать редактирование текста поста"""
    if not original_text:
        await update.message.reply_text("❌ Ошибка: оригинальный текст не найден")
        return

    # Анализировать изменения
    moderator.save_edit_analysis(post_id, original_text, edited_text)

    # Сохранить решение
    moderator.save_decision(post_id, 'edited', edited_text)

    # Переместить в очередь публикации
    await move_to_publishing_queue(post_id, edited_text)

    keyboard = [
        [InlineKeyboardButton("📋 Модерировать еще", callback_data='moderate')],
        [InlineKeyboardButton("📊 Статистика", callback_data='stats')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"✅ Пост обновлен!\n\n"
        f"📝 _{edited_text[:100]}..._\n\n"
        f"*Анализ изменений:*\n"
        f"Было: {len(original_text)} символов\n"
        f"Стало: {len(edited_text)} символов\n"
        f"Изменение: {len(edited_text) - len(original_text):+d}",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_feedback_comment(update: Update, context: ContextTypes.DEFAULT_TYPE, comment: str, post_id: str):
    """Обработать комментарий/критику к варианту"""
    variants = context.user_data.get('current_variants', [])
    if not variants:
        await update.message.reply_text("❌ Нет варианта для комментирования")
        return

    current_index = context.user_data.get('current_variant_index', 0)
    current_variant = variants[current_index]

    # Сохранить комментарий
    feedback_obj = {
        "post_id": post_id,
        "variant_id": current_variant.get('variant_id'),
        "original_text": current_variant['text'],
        "comment": comment,
        "rubric": current_variant.get('rubric'),
        "tone": current_variant.get('tone'),
        "comment_at": datetime.now().isoformat()
    }

    feedback_file = DATA_DIR / 'комментарии_модератора.json'
    feedbacks = []
    if feedback_file.exists():
        with open(feedback_file, 'r', encoding='utf-8') as f:
            feedbacks = json.load(f)

    feedbacks.append(feedback_obj)

    with open(feedback_file, 'w', encoding='utf-8') as f:
        json.dump(feedbacks, f, ensure_ascii=False, indent=2)

    # Анализировать комментарий и создать выводы для следующего поста
    analysis = await analyze_feedback_comment(comment, current_variant)

    keyboard = [
        [InlineKeyboardButton("✅ Готово, выкладываю пост", callback_data='posting_done')],
        [InlineKeyboardButton("📋 Модерировать еще", callback_data='moderate')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    response = f"""
✅ *Комментарий сохранен*

📝 Вариант: _{current_variant['text'][:80]}..._

💬 Твой комментарий:
_{comment}_

---

*Выводы для следующего поста:*
{analysis}

Когда выложишь текущий пост, отправь мне сюда результат для анализа метрик.
"""

    await update.message.reply_text(
        response,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def analyze_feedback_comment(comment: str, variant: Dict) -> str:
    """Анализировать комментарий как глобальное правило для всех будущих постов"""

    # Сохранить правило как есть (без переформатирования)
    global_rule = {
        "rule": comment,
        "priority": "high",
        "applies_to": "all_posts",
        "created_at": datetime.now().isoformat(),
        "from_variant_id": variant.get('variant_id'),
        "from_rubric": variant.get('rubric'),
        "from_tone": variant.get('tone')
    }

    rules_file = DATA_DIR / 'глобальные_правила.json'
    rules = []
    if rules_file.exists():
        with open(rules_file, 'r', encoding='utf-8') as f:
            try:
                rules = json.load(f)
            except:
                rules = []

    rules.append(global_rule)

    with open(rules_file, 'w', encoding='utf-8') as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    return f"""📌 *Глобальное правило добавлено*

Правило будет применяться ко всем следующим постам:
_{comment}_

Это правило передастся генератору идей (Этап 1) для учета при создании новых вариантов."""

async def write_post_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Запустить режим 'Напиши пост'"""
    query = update.callback_query
    await query.answer()

    context.user_data['mode'] = 'write_post'

    await query.edit_message_text(
        "✍️ *Напиши пост*\n\n"
        "Отправь мне текст или идею поста, я его разработаю и добавлю в очередь.\n\n"
        "_Сообщение ниже_"
    )

async def write_by_thesis_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Запустить режим 'Пост по тезисам'"""
    query = update.callback_query
    await query.answer()

    context.user_data['mode'] = 'write_by_thesis'

    await query.edit_message_text(
        "📌 *Пост по тезисам*\n\n"
        "Отправь мне ключевые пункты (можешь через запятую или список), я разверну их в полный пост.\n\n"
        "Пример:\n_вкус клубники, кислота, освежающий, летний_\n\n"
        "_Сообщение ниже_"
    )

async def generate_post_from_text(text: str) -> str:
    """Генерировать пост на основе текста/идеи пользователя"""
    # Загрузить конфиг бренда
    brand_file = CONFIG_DIR / 'БрендКонфиг.json'
    brand_config = {}
    if brand_file.exists():
        with open(brand_file, 'r', encoding='utf-8') as f:
            brand_config = json.load(f)

    # Загрузить правила
    global_rules_file = DATA_DIR / 'глобальные_правила.json'
    global_rules = []
    if global_rules_file.exists():
        with open(global_rules_file, 'r', encoding='utf-8') as f:
            try:
                global_rules = json.load(f)
            except:
                global_rules = []

    # Составить правила
    rules_text = "\n".join([f"- {r['rule']}" for r in global_rules])
    if rules_text:
        rules_text = f"\nУчти эти правила:\n{rules_text}"

    # Промпт для Claude
    prompt = f"""Ты генерируешь пост для Telegram-канала Podonki (бренд вейпинга, аудитория 16-23 лет).

**Обязательные правила:**
- Если пост о продукции или бренде: используй только факты из конфига Podonki. Не выдумывай характеристики, цены, вкусы.
- Все посты должны быть неотличимы от человеческого текста. Никаких плоских шуток, кринжа.
- Язык — молодёжный русский (16-23 лет), но понятный.
- Ноль орфографических, пунктуационных, грамматических ошибок.{rules_text}

**Текст пользователя/идея:**
{text}

**Задача:**
На основе текста пользователя напиши полный пост для Telegram. Сделай его интригующим, с хорошим заголовком и финалом. Пост должен быть готов к публикации.

Формат: просто текст поста, без дополнительных комментариев."""

    # Mock вызов Claude (позже заменить на реальный API)
    post_text = f"*Пост от текста пользователя*\n\n{text}\n\n_[Пост готов к публикации]_"

    return post_text

async def expand_thesis_to_post(thesis: str) -> str:
    """Развернуть тезисы в полный пост"""
    # Загрузить конфиг и правила (как выше)
    brand_file = CONFIG_DIR / 'БрендКонфиг.json'
    brand_config = {}
    if brand_file.exists():
        with open(brand_file, 'r', encoding='utf-8') as f:
            brand_config = json.load(f)

    global_rules_file = DATA_DIR / 'глобальные_правила.json'
    global_rules = []
    if global_rules_file.exists():
        with open(global_rules_file, 'r', encoding='utf-8') as f:
            try:
                global_rules = json.load(f)
            except:
                global_rules = []

    rules_text = "\n".join([f"- {r['rule']}" for r in global_rules])
    if rules_text:
        rules_text = f"\nУчти эти правила:\n{rules_text}"

    # Промпт для Claude
    prompt = f"""Ты генерируешь пост для Telegram-канала Podonki (бренд вейпинга, аудитория 16-23 лет).

**Обязательные правила:**
- Если пост о продукции или бренде: используй только факты из конфига Podonki. Не выдумывай характеристики, цены, вкусы.
- Все посты должны быть неотличимы от человеческого текста. Никаких плоских шуток, кринжа.
- Язык — молодёжный русский (16-23 лет), но понятный.
- Ноль орфографических, пунктуационных, грамматических ошибок.{rules_text}

**Ключевые тезисы:**
{thesis}

**Задача:**
Развернуть эти тезисы в полный, интригующий пост для Telegram. Добавь заголовок, переходы между пунктами, сделай живым и интересным. Пост должен быть готов к публикации.

Формат: просто текст поста, без дополнительных комментариев."""

    # Mock вызов Claude (позже заменить на реальный API)
    post_text = f"*Пост от тезисов*\n\n{thesis}\n\n_[Пост готов к публикации]_"

    return post_text

async def handle_write_post_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработать текст для 'Напиши пост' или 'По тезисам'"""
    user_text = update.message.text
    mode = context.user_data.get('mode')

    if not mode:
        return

    # Генерировать пост
    if mode == 'write_post':
        post_text = await generate_post_from_text(user_text)
    elif mode == 'write_by_thesis':
        post_text = await expand_thesis_to_post(user_text)
    else:
        return

    # Создать ID и переместить в очередь публикации
    post_id = f"post_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    await move_to_publishing_queue(post_id, post_text)

    keyboard = [
        [InlineKeyboardButton("📋 Модерировать еще", callback_data='moderate')],
        [InlineKeyboardButton("✍️ Еще пост", callback_data='write_post')],
        [InlineKeyboardButton("📊 Главное меню", callback_data='start')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"✅ *Пост создан и добавлен в очередь!*\n\n"
        f"📝 _{post_text[:100]}..._\n\n"
        f"Пост готов к публикации.",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

    # Очистить режим
    context.user_data['mode'] = None

async def trigger_next_post_generation():
    """Триггер для генерации следующего поста"""
    # Записать флаг для n8n webhook
    trigger_file = DATA_DIR / 'generate_next_post.json'

    trigger_data = {
        "triggered_at": datetime.now().isoformat(),
        "action": "generate_next_post"
    }

    with open(trigger_file, 'w', encoding='utf-8') as f:
        json.dump(trigger_data, f, ensure_ascii=False, indent=2)

async def move_to_publishing_queue(post_id: str, text: str):
    """Переместить пост из модерации в очередь публикации и триггирить следующий"""
    # Загрузить пост из очереди модерации
    moderation_file = DATA_DIR / 'очередь_модерации.json'

    if moderation_file.exists():
        with open(moderation_file, 'r', encoding='utf-8') as f:
            mod_data = json.load(f)

        # Найти пост
        if mod_data.get('post_id') == post_id:
            # Создать пост для публикации
            post_for_publishing = {
                "id": post_id,
                "text": text,
                "scheduled_time": None,  # Администратор установит время
                "media": None,
                "status": "pending",
                "sent_at": None,
                "message_id": None,
                "error": None,
                "approved_by_moderator": True,
                "approved_at": datetime.now().isoformat()
            }

            # Добавить в очередь публикации
            publishing_file = DATA_DIR / 'очередь_постов.json'

            posts = []
            if publishing_file.exists():
                with open(publishing_file, 'r', encoding='utf-8') as f:
                    try:
                        posts = json.load(f)
                    except:
                        posts = []

            posts.append(post_for_publishing)

            with open(publishing_file, 'w', encoding='utf-8') as f:
                json.dump(posts, f, ensure_ascii=False, indent=2)

            # Триггирить генерацию следующего поста
            await trigger_next_post_generation()

# ========== MAIN ==========

def main():
    """Запустить бот"""
    # Загрузить токен
    token_file = Path.home() / '.claude' / 'api-keys' / 'telegram-bot-token'
    with open(token_file, 'r') as f:
        token = f.read().strip()

    # Создать приложение
    app = Application.builder().token(token).build()

    # Обработчики команд
    app.add_handler(CommandHandler('start', start))

    # Обработчик кнопок (ВАЖНО: перед MessageHandler)
    app.add_handler(CallbackQueryHandler(button_handler))

    # Обработчик текстовых сообщений (для редактирования)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_edited_text))

    # Запустить бот
    print("🤖 Бот запущен. Жди сообщений...")
    app.run_polling()

if __name__ == '__main__':
    main()
