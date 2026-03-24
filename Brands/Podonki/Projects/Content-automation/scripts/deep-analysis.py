#!/usr/bin/env python
"""
Deep Analysis — комплексный анализ 418 постов Telegram-канала PODONKI.
Генерирует JSON-отчёт и текстовый отчёт на русском.
Без внешних зависимостей (stdlib only).
"""

from __future__ import annotations

import json
import re
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_FILE = SCRIPT_DIR / "parsed-telegram-posts.json"
OUTPUT_JSON = SCRIPT_DIR / "deep-analysis-report.json"
OUTPUT_TXT = SCRIPT_DIR / "deep-analysis-report.txt"

# ──────────────────────────────────────────────────────────────────
# Constants / dictionaries
# ──────────────────────────────────────────────────────────────────

CASUAL_MARKERS = [
    "кстати", "короче", "офигеть", "блин", "ваще", "норм", "чё", "зацени",
    "реально", "прикол", "кайф", "огонь", "жесть", "чёт", "чел",
    "лол", "ахах", "хах", "ору", "залетай", "зацепил",
    "круто", "бомба", "дерзкий", "дерзко", "зашёл", "крутяк",
    "бро", "чувак", "забей", "зашибись", "клёво", "окей",
    "буллшит", "химоз", "горчат", "дуреете", "кайфуй", "мощь",
    "банальщин", "фигня", "нафиг", "тащит",
]

# These short words need word-boundary matching to avoid false positives
CASUAL_WORD_BOUNDARY = ["го", "ок", "лан", "пон", "щас", "топ"]

FORMAL_MARKERS = [
    "уважаемый", "данный", "является", "осуществлять", "в связи с",
    "настоящим", "информируем", "предоставляем", "функционал",
    "в рамках", "посредством", "вышеуказанный", "нижеследующий",
]

PRODUCT_KEYWORDS: dict[str, list[str]] = {
    "Конструктор": ["конструктор", "pdnk конструктор", "конструкторы"],
    "Podgon": ["podgon", "подгон"],
    "Podgonki": ["podgonki", "подгонки"],
    "Critical": ["critical", "критикал"],
    "Original": ["original", "оригинал"],
    "Last Hap": ["last hap", "ласт хап"],
    "Никпак": ["никпак", "nickpack", "nick pack"],
    "Hotspot": ["hotspot", "хотспот"],
    "Sour": ["sour", "кислый", "кислая линейка"],
    "Slick": ["slick", "слик"],
    "Click": ["click", "клик"],
    "Mini": ["pdnk mini"],
    "Swedish": ["swedish"],
    "Vintage": ["vintage", "винтаж"],
}

CTA_PATTERNS: dict[str, str] = {
    "пиши": r"пиши(?:те)?",
    "подпис": r"подпис\w+",
    "ставь": r"ставь(?:те)?",
    "попробуй": r"попробуй(?:те)?",
    "участвуй": r"участвуй(?:те)?",
    "менеджер": r"менеджер\w*",
    "жми": r"жми(?:те)?",
    "ссылк": r"ссылк\w+",
    "купи": r"купи(?:те)?",
    "забери": r"забери(?:те)?|забирай(?:те)?",
    "узнай": r"узна[йю]\w*",
    "выбирай": r"выбирай(?:те)?",
    "переходи": r"переходи(?:те)?",
    "оставь": r"оставь(?:те)?",
    "голосуй": r"голосуй(?:те)?",
    "угадай": r"угадай(?:те)?",
}

CATEGORY_RULES: list[tuple[str, Any]] = []  # filled dynamically

MONTHS_RU = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}

DAYS_RU = {
    0: "Понедельник", 1: "Вторник", 2: "Среда", 3: "Четверг",
    4: "Пятница", 5: "Суббота", 6: "Воскресенье",
}

# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────

EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002600-\U000026FF"
    "\U00002700-\U000027BF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D"
    "\U00002B50"
    "\U00002B55"
    "\U0000203C"
    "\U00002049"
    "\U00002139"
    "\U0000231A-\U0000231B"
    "\U000023E9-\U000023F3"
    "\U000023F8-\U000023FA"
    "\U000025AA-\U000025AB"
    "\U000025B6"
    "\U000025C0"
    "\U000025FB-\U000025FE"
    "\U00002934-\U00002935"
    "\U00002B05-\U00002B07"
    "\U00002B1B-\U00002B1C"
    "\U00003030"
    "\U0000303D"
    "\U00003297"
    "\U00003299"
    "\U0000200D"
    "\U0000FE0F"
    "➖❓❗‼️☝"
    "]+",
    re.UNICODE,
)

MENTION_RE = re.compile(r"@[\w]+")
URL_RE = re.compile(r"https?://\S+")
HASHTAG_RE = re.compile(r"#[\w]+")


def extract_emojis(text: str) -> list[str]:
    return [ch for ch in text if is_emoji(ch)]


def is_emoji(ch: str) -> bool:
    cp = ord(ch)
    return (
        0x1F600 <= cp <= 0x1F64F
        or 0x1F300 <= cp <= 0x1F5FF
        or 0x1F680 <= cp <= 0x1F6FF
        or 0x1F1E0 <= cp <= 0x1F1FF
        or 0x2702 <= cp <= 0x27B0
        or 0x24C2 <= cp <= 0x1F251
        or 0x1F900 <= cp <= 0x1F9FF
        or 0x1FA00 <= cp <= 0x1FA6F
        or 0x1FA70 <= cp <= 0x1FAFF
        or 0x2600 <= cp <= 0x26FF
        or 0x2700 <= cp <= 0x27BF
        or 0xFE00 <= cp <= 0xFE0F
        or 0x2B50 <= cp <= 0x2B55
        or 0x203C <= cp <= 0x2049
        or 0x2139 == cp
        or 0x231A <= cp <= 0x231B
        or 0x23E9 <= cp <= 0x23FA
        or 0x25AA <= cp <= 0x25FE
        or 0x2934 <= cp <= 0x2935
        or 0x2B05 <= cp <= 0x2B1C
        or cp in (0x3030, 0x303D, 0x3297, 0x3299, 0x200D, 0x2796, 0x2753, 0x2757, 0x261D)
    )


def count_emojis(text: str) -> int:
    return len(extract_emojis(text))


def has_question(text: str) -> bool:
    return "?" in text or "❓" in text


def has_list_markers(text: str) -> bool:
    return bool(re.search(r"[✅🟢➖•\-]\s*\S", text)) or bool(re.search(r"\d[.)\s]", text))


def has_paragraphs(text: str) -> bool:
    return "\n\n" in text or text.count("\n") >= 3


def count_sentences(text: str) -> int:
    clean = re.sub(r"https?://\S+", "", text)
    clean = re.sub(r"@[\w]+", "", clean)
    sents = re.split(r"[.!?…]+", clean)
    return len([s for s in sents if s.strip() and len(s.strip()) > 5])


def avg_sentence_length(text: str) -> float:
    clean = re.sub(r"https?://\S+", "", text)
    sents = re.split(r"[.!?…]+", clean)
    lengths = [len(s.strip()) for s in sents if s.strip() and len(s.strip()) > 5]
    return statistics.mean(lengths) if lengths else 0


def structure_score(text: str) -> float:
    score = 0.0
    if has_paragraphs(text):
        score += 1.0
    if has_list_markers(text):
        score += 1.0
    if has_question(text):
        score += 0.5
    if count_emojis(text) > 0:
        score += 0.5
    n_lines = text.count("\n")
    if n_lines >= 5:
        score += 1.0
    elif n_lines >= 2:
        score += 0.5
    if len(text) > 300:
        score += 0.5
    return min(score, 5.0)


def casual_score(text: str) -> int:
    lower = text.lower()
    score = sum(1 for m in CASUAL_MARKERS if m in lower)
    for w in CASUAL_WORD_BOUNDARY:
        if re.search(rf"\b{w}\b", lower):
            score += 1
    return score


def formal_score(text: str) -> int:
    lower = text.lower()
    return sum(1 for m in FORMAL_MARKERS if m in lower)


def find_ctas(text: str) -> list[str]:
    lower = text.lower()
    found = []
    for label, pat in CTA_PATTERNS.items():
        if re.search(pat, lower):
            found.append(label)
    return found


def find_products(text: str) -> list[str]:
    lower = text.lower()
    found = []
    for product, keywords in PRODUCT_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                found.append(product)
                break
    return found


def find_mentions(text: str) -> list[str]:
    return MENTION_RE.findall(text)


def addressing_style(text: str) -> str:
    ty_count = len(re.findall(r"\bты\b|\bтебе\b|\bтебя\b|\bтвой\b|\bтвоей\b|\bтвоих\b|\bтвоему\b", text.lower()))
    vy_count = len(re.findall(r"\bвы\b|\bвам\b|\bвас\b|\bваш\b|\bвашей\b|\bваших\b|\bвашему\b", text.lower()))
    if ty_count > vy_count:
        return "ты"
    elif vy_count > ty_count:
        return "вы"
    elif ty_count > 0:
        return "mixed"
    return "none"


# ──────────────────────────────────────────────────────────────────
# Post classification
# ──────────────────────────────────────────────────────────────────

def classify_post(post: dict) -> str:
    text = post["text"]
    lower = text.lower()
    length = len(text)

    # Media-only (very short + media)
    if length < 50 and post["has_media"]:
        return "media_only"

    # Short engagement (short, no product, casual)
    if length < 80 and not find_products(text):
        return "engagement"

    # Quiz / game
    quiz_markers = ["угадай", "какой вкус", "викторин", "загадк", "отгадай",
                    "правильный ответ", "голосуй", "🔠", "что зашифрован"]
    if any(m in lower for m in quiz_markers):
        return "quiz_game"

    # Contest / giveaway
    contest_markers = ["розыгрыш", "конкурс", "приз", "победител", "разыгры",
                       "участвуй", "условия", "подпис", "репост"]
    if sum(1 for m in contest_markers if m in lower) >= 2:
        return "promo_contest"

    # Meme / fun
    meme_markers = ["💀", "😂", "🤣", "ору", "мем", "ахах", "ахаха", "прикол"]
    if length < 200 and any(m in lower or m in text for m in meme_markers):
        return "meme_fun"

    # Product description (detailed product info)
    products = find_products(text)
    product_detail_markers = ["вкус", "крепость", "линейка", "мг", "что такое",
                              "что внутри", "фаворит", "✅", "🟢"]
    if products and length > 200 and sum(1 for m in product_detail_markers if m in lower or m in text) >= 2:
        return "product_desc"

    # Promo with product mention
    if products and (find_ctas(text) or any(m in lower for m in ["купи", "забери", "попробуй", "менеджер"])):
        return "promo_contest"

    # Educational / informational
    edu_markers = ["что такое", "почему", "как работает", "совет", "гайд",
                   "правил", "объясня", "расскажем", "важно знать"]
    if any(m in lower for m in edu_markers) and length > 150:
        return "info_edu"

    # Announcement
    announce_markers = ["внимание", "анонс", "новост", "обновлен", "важно",
                        "‼️", "⚡️", "🚨", "❗"]
    if any(m in lower or m in text for m in announce_markers):
        return "announcement"

    # Entertainment (holiday, storytelling, fun content)
    fun_markers = ["поздравля", "праздник", "с днём", "с новым", "с 8 март",
                   "настроен", "бежит", "история"]
    if any(m in lower for m in fun_markers):
        return "entertainment"

    # Fallback: short → engagement, long with structure → info_edu, with products → promo
    if length < 100:
        return "engagement"
    if products:
        return "promo_contest"
    if has_list_markers(text) or has_paragraphs(text):
        return "info_edu"

    return "promo_contest"


# ──────────────────────────────────────────────────────────────────
# Main analysis
# ──────────────────────────────────────────────────────────────────

def load_posts() -> list[dict]:
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data[0]["posts"]


def enrich_post(post: dict) -> dict:
    text = post["text"]
    dt = datetime.fromisoformat(post["date"].replace("Z", "+00:00"))
    return {
        **post,
        "dt": dt,
        "length": len(text),
        "category": classify_post(post),
        "emoji_count": count_emojis(text),
        "emojis": extract_emojis(text),
        "has_question": has_question(text),
        "has_list": has_list_markers(text),
        "has_paragraphs": has_paragraphs(text),
        "sentence_count": count_sentences(text),
        "avg_sent_len": avg_sentence_length(text),
        "structure_score": structure_score(text),
        "casual_score": casual_score(text),
        "formal_score": formal_score(text),
        "addressing": addressing_style(text),
        "ctas": find_ctas(text),
        "products": find_products(text),
        "mentions": find_mentions(text),
        "month_key": f"{dt.year}-{dt.month:02d}",
        "day_of_week": dt.weekday(),
        "hour": dt.hour,
    }


def analyze(posts: list[dict]) -> dict:
    enriched = [enrich_post(p) for p in posts]
    report: dict[str, Any] = {}

    # ── 1. Overview ──
    lengths = [p["length"] for p in enriched]
    report["overview"] = {
        "total_posts": len(enriched),
        "date_range": {
            "from": min(p["dt"] for p in enriched).isoformat(),
            "to": max(p["dt"] for p in enriched).isoformat(),
        },
        "avg_length": round(statistics.mean(lengths), 1),
        "median_length": round(statistics.median(lengths), 1),
        "std_length": round(statistics.stdev(lengths), 1) if len(lengths) > 1 else 0,
        "length_distribution": {
            "<100": sum(1 for l in lengths if l < 100),
            "100-300": sum(1 for l in lengths if 100 <= l < 300),
            "300-500": sum(1 for l in lengths if 300 <= l < 500),
            "500-1000": sum(1 for l in lengths if 500 <= l < 1000),
            "1000-1500": sum(1 for l in lengths if 1000 <= l < 1500),
            "1500+": sum(1 for l in lengths if l >= 1500),
        },
        "with_media": sum(1 for p in enriched if p["has_media"]),
        "without_media": sum(1 for p in enriched if not p["has_media"]),
        "media_rate": round(sum(1 for p in enriched if p["has_media"]) / len(enriched) * 100, 1),
        "target_length": "1000-1500 символов с пробелами",
        "in_target_range": sum(1 for l in lengths if 1000 <= l <= 1500),
        "in_target_pct": round(sum(1 for l in lengths if 1000 <= l <= 1500) / len(lengths) * 100, 1),
    }

    # ── 2. Category analysis ──
    categories: dict[str, list[dict]] = defaultdict(list)
    for p in enriched:
        categories[p["category"]].append(p)

    cat_stats = {}
    for cat, cat_posts in sorted(categories.items(), key=lambda x: -len(x[1])):
        cat_lengths = [p["length"] for p in cat_posts]
        cat_stats[cat] = {
            "count": len(cat_posts),
            "pct": round(len(cat_posts) / len(enriched) * 100, 1),
            "avg_length": round(statistics.mean(cat_lengths), 1),
            "median_length": round(statistics.median(cat_lengths), 1),
            "avg_emoji_count": round(statistics.mean([p["emoji_count"] for p in cat_posts]), 1),
            "emoji_density": round(
                statistics.mean([p["emoji_count"] / max(p["length"], 1) * 100 for p in cat_posts]), 2
            ),
            "question_rate": round(sum(1 for p in cat_posts if p["has_question"]) / len(cat_posts) * 100, 1),
            "cta_rate": round(sum(1 for p in cat_posts if p["ctas"]) / len(cat_posts) * 100, 1),
            "avg_structure_score": round(statistics.mean([p["structure_score"] for p in cat_posts]), 2),
            "with_media_pct": round(sum(1 for p in cat_posts if p["has_media"]) / len(cat_posts) * 100, 1),
            "avg_casual_score": round(statistics.mean([p["casual_score"] for p in cat_posts]), 2),
            "example_ids": [p["id"] for p in sorted(cat_posts, key=lambda x: -x["structure_score"])[:3]],
        }
    report["categories"] = cat_stats

    # ── 3. Tone analysis ──
    casual_posts = [p for p in enriched if p["casual_score"] > 0]
    formal_posts = [p for p in enriched if p["formal_score"] > 0]
    addressing_counts = Counter(p["addressing"] for p in enriched)

    all_casual_words: Counter = Counter()
    for p in enriched:
        lower = p["text"].lower()
        for m in CASUAL_MARKERS:
            cnt = lower.count(m)
            if cnt > 0:
                all_casual_words[m] += cnt
        for w in CASUAL_WORD_BOUNDARY:
            cnt = len(re.findall(rf"\b{w}\b", lower))
            if cnt > 0:
                all_casual_words[w] += cnt

    report["tone"] = {
        "casual_posts_count": len(casual_posts),
        "casual_posts_pct": round(len(casual_posts) / len(enriched) * 100, 1),
        "formal_posts_count": len(formal_posts),
        "formal_posts_pct": round(len(formal_posts) / len(enriched) * 100, 1),
        "avg_casual_score": round(statistics.mean([p["casual_score"] for p in enriched]), 2),
        "top_casual_words": dict(all_casual_words.most_common(15)),
        "addressing": dict(addressing_counts.most_common()),
        "addressing_pct": {
            k: round(v / len(enriched) * 100, 1) for k, v in addressing_counts.most_common()
        },
    }

    # ── 4. Emoji analysis ──
    all_emojis: Counter = Counter()
    for p in enriched:
        all_emojis.update(p["emojis"])

    emoji_densities = [p["emoji_count"] / max(p["length"], 1) * 100 for p in enriched]
    report["emojis"] = {
        "total_emoji_usage": sum(all_emojis.values()),
        "unique_emojis": len(all_emojis),
        "top_20": dict(all_emojis.most_common(20)),
        "avg_emoji_per_post": round(statistics.mean([p["emoji_count"] for p in enriched]), 1),
        "median_emoji_per_post": round(statistics.median([p["emoji_count"] for p in enriched]), 1),
        "avg_density_pct": round(statistics.mean(emoji_densities), 2),
        "posts_with_emoji_pct": round(
            sum(1 for p in enriched if p["emoji_count"] > 0) / len(enriched) * 100, 1
        ),
    }

    # ── 5. Temporal patterns ──
    by_month: dict[str, list] = defaultdict(list)
    by_dow: dict[int, list] = defaultdict(list)
    by_hour: dict[int, list] = defaultdict(list)

    for p in enriched:
        by_month[p["month_key"]].append(p)
        by_dow[p["day_of_week"]].append(p)
        by_hour[p["hour"]].append(p)

    month_stats = {}
    for mk in sorted(by_month):
        mp = by_month[mk]
        month_stats[mk] = {
            "count": len(mp),
            "avg_length": round(statistics.mean([p["length"] for p in mp]), 1),
            "categories": dict(Counter(p["category"] for p in mp).most_common()),
        }

    dow_stats = {}
    for d in range(7):
        dp = by_dow.get(d, [])
        dow_stats[DAYS_RU[d]] = {
            "count": len(dp),
            "avg_length": round(statistics.mean([p["length"] for p in dp]), 1) if dp else 0,
        }

    hour_stats = {}
    for h in range(24):
        hp = by_hour.get(h, [])
        if hp:
            hour_stats[f"{h:02d}:00"] = {
                "count": len(hp),
                "avg_length": round(statistics.mean([p["length"] for p in hp]), 1),
            }

    report["temporal"] = {
        "by_month": month_stats,
        "by_day_of_week": dow_stats,
        "by_hour": hour_stats,
        "busiest_month": max(month_stats, key=lambda k: month_stats[k]["count"]),
        "busiest_day": max(dow_stats, key=lambda k: dow_stats[k]["count"]),
        "busiest_hours": sorted(
            hour_stats, key=lambda k: hour_stats[k]["count"], reverse=True
        )[:5],
    }

    # ── 6. CTA analysis ──
    all_ctas: Counter = Counter()
    for p in enriched:
        all_ctas.update(p["ctas"])

    posts_with_cta = [p for p in enriched if p["ctas"]]
    report["cta"] = {
        "posts_with_cta": len(posts_with_cta),
        "cta_rate_pct": round(len(posts_with_cta) / len(enriched) * 100, 1),
        "cta_frequency": dict(all_ctas.most_common()),
        "avg_ctas_per_post": round(
            statistics.mean([len(p["ctas"]) for p in posts_with_cta]), 2
        ) if posts_with_cta else 0,
        "cta_by_category": {
            cat: round(sum(1 for p in cp if p["ctas"]) / len(cp) * 100, 1)
            for cat, cp in categories.items()
        },
    }

    # ── 7. Product analysis ──
    all_products: Counter = Counter()
    for p in enriched:
        all_products.update(p["products"])

    product_posts = [p for p in enriched if p["products"]]
    product_detail: dict[str, dict] = {}
    for prod_name in all_products:
        pp = [p for p in enriched if prod_name in p["products"]]
        product_detail[prod_name] = {
            "mentions": all_products[prod_name],
            "avg_post_length": round(statistics.mean([p["length"] for p in pp]), 1),
            "categories": dict(Counter(p["category"] for p in pp).most_common()),
            "cta_rate": round(sum(1 for p in pp if p["ctas"]) / len(pp) * 100, 1),
            "avg_structure": round(statistics.mean([p["structure_score"] for p in pp]), 2),
            "sample_id": pp[0]["id"] if pp else None,
        }

    report["products"] = {
        "total_product_posts": len(product_posts),
        "product_post_rate_pct": round(len(product_posts) / len(enriched) * 100, 1),
        "product_frequency": dict(all_products.most_common()),
        "product_details": product_detail,
    }

    # ── 8. Structure analysis ──
    scores = [p["structure_score"] for p in enriched]
    report["structure"] = {
        "avg_score": round(statistics.mean(scores), 2),
        "median_score": round(statistics.median(scores), 2),
        "with_paragraphs_pct": round(
            sum(1 for p in enriched if p["has_paragraphs"]) / len(enriched) * 100, 1
        ),
        "with_lists_pct": round(
            sum(1 for p in enriched if p["has_list"]) / len(enriched) * 100, 1
        ),
        "with_questions_pct": round(
            sum(1 for p in enriched if p["has_question"]) / len(enriched) * 100, 1
        ),
        "avg_sentences": round(statistics.mean([p["sentence_count"] for p in enriched]), 1),
        "avg_sent_length": round(statistics.mean([p["avg_sent_len"] for p in enriched]), 1),
        "score_distribution": {
            "0-1": sum(1 for s in scores if s <= 1),
            "1-2": sum(1 for s in scores if 1 < s <= 2),
            "2-3": sum(1 for s in scores if 2 < s <= 3),
            "3-4": sum(1 for s in scores if 3 < s <= 4),
            "4-5": sum(1 for s in scores if 4 < s <= 5),
        },
    }

    # ── 9. Mentions analysis ──
    all_mentions: Counter = Counter()
    for p in enriched:
        all_mentions.update(p["mentions"])

    report["mentions"] = {
        "total_mentions": sum(all_mentions.values()),
        "unique_accounts": len(all_mentions),
        "top_mentions": dict(all_mentions.most_common(10)),
    }

    # ── 10. Best posts ──
    best_structured = sorted(enriched, key=lambda p: (-p["structure_score"], -p["length"]))[:5]
    best_casual = sorted(enriched, key=lambda p: (-p["casual_score"], -p["structure_score"]))[:5]
    longest = sorted(enriched, key=lambda p: -p["length"])[:5]
    best_overall = sorted(
        enriched,
        key=lambda p: (
            -p["structure_score"] * 2
            - p["casual_score"] * 3
            - (1 if p["has_question"] else 0) * 2
            - (1 if p["ctas"] else 0) * 2
            - min(p["length"] / 500, 1) * 2
        ),
    )[:10]

    def post_summary(p: dict) -> dict:
        return {
            "id": p["id"],
            "date": p["dt"].strftime("%Y-%m-%d"),
            "category": p["category"],
            "length": p["length"],
            "structure_score": p["structure_score"],
            "casual_score": p["casual_score"],
            "has_question": p["has_question"],
            "ctas": p["ctas"],
            "products": p["products"],
            "text_preview": p["text"][:200] + ("..." if len(p["text"]) > 200 else ""),
        }

    report["best_posts"] = {
        "most_structured": [post_summary(p) for p in best_structured],
        "most_casual": [post_summary(p) for p in best_casual],
        "longest": [post_summary(p) for p in longest],
        "best_overall": [post_summary(p) for p in best_overall],
    }

    # ── 11. Hooks analysis ──
    hooks: Counter = Counter()
    for p in enriched:
        first_line = p["text"].split("\n")[0].strip()
        if first_line.startswith("🎉"):
            hooks["emoji_start"] += 1
        elif first_line.endswith("?") or first_line.endswith("❓"):
            hooks["question_hook"] += 1
        elif first_line.startswith("‼") or first_line.startswith("⚡") or "внимание" in first_line.lower():
            hooks["urgency_hook"] += 1
        elif any(p_name.lower() in first_line.lower() for p_name in PRODUCT_KEYWORDS):
            hooks["product_name_hook"] += 1
        elif len(first_line) < 40 and count_emojis(first_line) > 0:
            hooks["short_emoji_hook"] += 1
        elif first_line.startswith(("Кстати", "Короче", "Ребят", "А вы")):
            hooks["conversational_hook"] += 1
        else:
            hooks["other"] += 1

    report["hooks"] = {
        "types": dict(hooks.most_common()),
        "total_analyzed": len(enriched),
    }

    # ── 12. Brand voice compliance ──
    compliant = 0
    issues: Counter = Counter()
    for p in enriched:
        is_compliant = True
        if p["formal_score"] > 0:
            is_compliant = False
            issues["formal_language"] += 1
        if p["length"] > 100 and p["emoji_count"] == 0:
            is_compliant = False
            issues["no_emoji_in_long_post"] += 1
        if p["length"] > 300 and not p["has_paragraphs"]:
            is_compliant = False
            issues["no_paragraphs_in_long_post"] += 1
        if p["addressing"] == "вы" and p["category"] not in ("announcement", "entertainment"):
            is_compliant = False
            issues["formal_вы_addressing"] += 1
        if p["length"] > 500 and p["casual_score"] == 0:
            issues["long_post_no_casual_tone"] += 1
        if is_compliant:
            compliant += 1

    report["brand_voice"] = {
        "compliant_posts": compliant,
        "compliance_rate_pct": round(compliant / len(enriched) * 100, 1),
        "issues": dict(issues.most_common()),
        "recommendations": _generate_recommendations(report, enriched, categories),
    }

    # ── 13. Content patterns ──
    avg_gap_hours = []
    sorted_posts = sorted(enriched, key=lambda p: p["dt"])
    for i in range(1, len(sorted_posts)):
        delta = (sorted_posts[i]["dt"] - sorted_posts[i - 1]["dt"]).total_seconds() / 3600
        avg_gap_hours.append(delta)

    report["posting_rhythm"] = {
        "avg_gap_hours": round(statistics.mean(avg_gap_hours), 1) if avg_gap_hours else 0,
        "median_gap_hours": round(statistics.median(avg_gap_hours), 1) if avg_gap_hours else 0,
        "min_gap_hours": round(min(avg_gap_hours), 1) if avg_gap_hours else 0,
        "max_gap_hours": round(max(avg_gap_hours), 1) if avg_gap_hours else 0,
        "posts_per_week_avg": round(len(enriched) / max((
            (max(p["dt"] for p in enriched) - min(p["dt"] for p in enriched)).days / 7
        ), 1), 1),
    }

    return report


def _generate_recommendations(report: dict, enriched: list[dict], categories: dict) -> list[str]:
    recs = []

    # Tone
    casual_pct = sum(1 for p in enriched if p["casual_score"] > 0) / len(enriched) * 100
    if casual_pct < 30:
        recs.append(
            f"Только {casual_pct:.0f}% постов содержат разговорные маркеры. "
            "Для ЦА 18-30 нужно больше неформальной лексики: 'короче', 'реально', 'кайф', 'огонь'."
        )

    # Structure
    avg_struct = statistics.mean([p["structure_score"] for p in enriched])
    if avg_struct < 2.5:
        recs.append(
            f"Средний балл структуры {avg_struct:.1f}/5. Добавляйте: абзацы, списки (✅🟢), вопросы."
        )

    # Questions
    q_pct = sum(1 for p in enriched if p["has_question"]) / len(enriched) * 100
    if q_pct < 50:
        recs.append(
            f"Вопросы только в {q_pct:.0f}% постов. Вопросы повышают вовлечённость — добавляйте в конце каждого поста."
        )

    # CTA
    cta_pct = sum(1 for p in enriched if p["ctas"]) / len(enriched) * 100
    if cta_pct < 40:
        recs.append(
            f"CTA только в {cta_pct:.0f}% постов. Каждый пост должен содержать призыв к действию."
        )

    # Product variety
    products = Counter()
    for p in enriched:
        products.update(p["products"])
    if products:
        top3 = products.most_common(3)
        bottom = [name for name, cnt in products.items() if cnt <= 5]
        if bottom:
            recs.append(
                f"Малоупоминаемые продукты: {', '.join(bottom)}. Увеличьте присутствие в контенте."
            )

    # Media
    media_pct = sum(1 for p in enriched if p["has_media"]) / len(enriched) * 100
    if media_pct < 60:
        recs.append(f"Медиа только в {media_pct:.0f}% постов. Telegram лучше работает с визуалом.")

    # Addressing
    addr = Counter(p["addressing"] for p in enriched)
    if addr.get("вы", 0) > addr.get("ты", 0):
        recs.append("Преобладает обращение на 'вы'. Для молодой ЦА лучше 'ты' — ближе и неформальнее.")

    # Category balance
    cat_counts = {cat: len(posts) for cat, posts in categories.items()}
    total = sum(cat_counts.values())
    entertainment_pct = (cat_counts.get("meme_fun", 0) + cat_counts.get("entertainment", 0)) / total * 100
    if entertainment_pct < 10:
        recs.append(
            f"Развлекательный контент: {entertainment_pct:.0f}%. Нужно минимум 15-20% для удержания аудитории."
        )

    engagement_pct = cat_counts.get("engagement", 0) / total * 100
    quiz_pct = cat_counts.get("quiz_game", 0) / total * 100
    if engagement_pct + quiz_pct < 15:
        recs.append("Мало интерактивного контента (опросы, квизы, вопросы). Добавьте 2-3 в неделю.")

    # Target length compliance
    target_posts = sum(1 for p in enriched if 1000 <= p["length"] <= 1500)
    target_pct = target_posts / len(enriched) * 100
    recs.append(
        f"Только {target_pct:.0f}% постов ({target_posts} из {len(enriched)}) попадают в целевой диапазон 1000-1500 символов с пробелами. "
        "Нужно увеличивать долю полноценных текстовых постов."
    )

    recs.append(
        "Лучшая формула поста: короткий цепляющий заголовок + 3-5 буллитов (✅/🟢) + вопрос + CTA. "
        "Целевая длина: 1000-1500 символов с пробелами."
    )

    return recs


# ──────────────────────────────────────────────────────────────────
# Text report generation
# ──────────────────────────────────────────────────────────────────

def generate_text_report(report: dict, posts: list[dict]) -> str:
    lines: list[str] = []
    w = lines.append

    def sep():
        w("=" * 80)

    def subsep():
        w("-" * 60)

    sep()
    w("  ГЛУБОКИЙ АНАЛИЗ TELEGRAM-КАНАЛА PODONKI")
    w(f"  {report['overview']['total_posts']} постов | {report['overview']['date_range']['from'][:10]} — {report['overview']['date_range']['to'][:10]}")
    sep()
    w("")

    # ── Overview ──
    w("1. ОБЩАЯ СТАТИСТИКА")
    subsep()
    ov = report["overview"]
    w(f"  Всего постов:          {ov['total_posts']}")
    w(f"  Средняя длина:         {ov['avg_length']} символов")
    w(f"  Медианная длина:       {ov['median_length']} символов")
    w(f"  Стд. отклонение:       {ov['std_length']} символов")
    w(f"  С медиа:               {ov['with_media']} ({ov['media_rate']}%)")
    w(f"  Без медиа:             {ov['without_media']}")
    w(f"  Целевая длина:         {ov['target_length']}")
    w(f"  В целевом диапазоне:   {ov['in_target_range']} ({ov['in_target_pct']}%)")
    w("")
    w("  Распределение по длине:")
    for bucket, count in ov["length_distribution"].items():
        bar = "#" * (count // 3)
        w(f"    {bucket:>10}: {count:>3} {bar}")
    w("")

    # ── Categories ──
    w("2. КАТЕГОРИИ ПОСТОВ")
    subsep()
    cat_labels = {
        "promo_contest": "Промо/Конкурсы",
        "info_edu": "Информационные/Образовательные",
        "media_only": "Только медиа (короткие)",
        "product_desc": "Описания продуктов",
        "quiz_game": "Квизы/Игры",
        "meme_fun": "Мемы/Юмор",
        "engagement": "Вовлечение (короткие)",
        "announcement": "Объявления",
        "entertainment": "Развлекательные",
    }
    for cat, stats in report["categories"].items():
        label = cat_labels.get(cat, cat)
        w(f"\n  {label} ({cat})")
        w(f"    Количество:       {stats['count']} ({stats['pct']}%)")
        w(f"    Средняя длина:    {stats['avg_length']} симв.")
        w(f"    Emoji плотность:  {stats['emoji_density']}%")
        w(f"    Вопросы:          {stats['question_rate']}%")
        w(f"    CTA:              {stats['cta_rate']}%")
        w(f"    Структура (0-5):  {stats['avg_structure_score']}")
        w(f"    Casual-тон:       {stats['avg_casual_score']}")
        w(f"    С медиа:          {stats['with_media_pct']}%")
    w("")

    # ── Tone ──
    w("3. АНАЛИЗ ТОНА")
    subsep()
    tone = report["tone"]
    w(f"  Посты с разговорным тоном:  {tone['casual_posts_count']} ({tone['casual_posts_pct']}%)")
    w(f"  Посты с формальным тоном:   {tone['formal_posts_count']} ({tone['formal_posts_pct']}%)")
    w(f"  Средний casual-score:       {tone['avg_casual_score']}")
    w("")
    w("  Топ casual-слова:")
    for word, cnt in list(tone["top_casual_words"].items())[:10]:
        w(f"    {word:>15}: {cnt}")
    w("")
    w("  Обращение к аудитории:")
    for style, pct in tone["addressing_pct"].items():
        label = {"ты": "на 'ты'", "вы": "на 'вы'", "mixed": "смешанное", "none": "без обращения"}.get(style, style)
        w(f"    {label:>20}: {pct}%")
    w("")

    # ── Emojis ──
    w("4. EMOJI")
    subsep()
    em = report["emojis"]
    w(f"  Всего использований:  {em['total_emoji_usage']}")
    w(f"  Уникальных:           {em['unique_emojis']}")
    w(f"  Среднее на пост:      {em['avg_emoji_per_post']}")
    w(f"  Средняя плотность:    {em['avg_density_pct']}%")
    w(f"  Посты с emoji:        {em['posts_with_emoji_pct']}%")
    w("")
    w("  Топ-20 emoji:")
    for emoji, cnt in list(em["top_20"].items())[:20]:
        bar = "#" * (cnt // 10)
        w(f"    {emoji}: {cnt:>4} {bar}")
    w("")

    # ── Temporal ──
    w("5. ВРЕМЕННЫЕ ПАТТЕРНЫ")
    subsep()
    temp = report["temporal"]
    w("  По месяцам:")
    for mk, ms in temp["by_month"].items():
        bar = "#" * (ms["count"] // 2)
        w(f"    {mk}: {ms['count']:>3} постов (ср. длина {ms['avg_length']}) {bar}")
    w("")
    w("  По дням недели:")
    for day, ds in temp["by_day_of_week"].items():
        bar = "#" * (ds["count"] // 2)
        w(f"    {day:>14}: {ds['count']:>3} постов {bar}")
    w("")
    w("  Топ-5 часов публикации:")
    for h in temp["busiest_hours"][:5]:
        hs = temp["by_hour"][h]
        w(f"    {h}: {hs['count']} постов (ср. длина {hs['avg_length']})")
    w(f"\n  Самый активный месяц: {temp['busiest_month']}")
    w(f"  Самый активный день:  {temp['busiest_day']}")
    w("")

    # ── Rhythm ──
    w("6. РИТМ ПУБЛИКАЦИЙ")
    subsep()
    rh = report["posting_rhythm"]
    w(f"  Среднее между постами: {rh['avg_gap_hours']} часов")
    w(f"  Медианное:             {rh['median_gap_hours']} часов")
    w(f"  Мин/Макс:              {rh['min_gap_hours']} / {rh['max_gap_hours']} часов")
    w(f"  Постов в неделю:       ~{rh['posts_per_week_avg']}")
    w("")

    # ── CTA ──
    w("7. ПРИЗЫВЫ К ДЕЙСТВИЮ (CTA)")
    subsep()
    cta = report["cta"]
    w(f"  Постов с CTA: {cta['posts_with_cta']} ({cta['cta_rate_pct']}%)")
    w(f"  Среднее CTA на пост: {cta['avg_ctas_per_post']}")
    w("")
    w("  Частотность CTA:")
    for label, cnt in cta["cta_frequency"].items():
        bar = "#" * (cnt // 2)
        w(f"    {label:>15}: {cnt:>3} {bar}")
    w("")
    w("  CTA по категориям:")
    for cat, pct in cta["cta_by_category"].items():
        w(f"    {cat:>20}: {pct}%")
    w("")

    # ── Products ──
    w("8. ПРОДУКТЫ")
    subsep()
    prod = report["products"]
    w(f"  Постов с продуктами: {prod['total_product_posts']} ({prod['product_post_rate_pct']}%)")
    w("")
    w("  Упоминания продуктов:")
    for name, cnt in prod["product_frequency"].items():
        bar = "#" * cnt
        w(f"    {name:>15}: {cnt:>3} {bar}")
    w("")
    w("  Детали по продуктам:")
    for name, det in prod["product_details"].items():
        w(f"    {name}:")
        w(f"      Упоминаний: {det['mentions']}, Ср. длина: {det['avg_post_length']}, CTA: {det['cta_rate']}%, Структура: {det['avg_structure']}")
        w(f"      Категории: {det['categories']}")
    w("")

    # ── Structure ──
    w("9. СТРУКТУРА ПОСТОВ")
    subsep()
    st = report["structure"]
    w(f"  Средний балл:       {st['avg_score']}/5")
    w(f"  Медианный балл:     {st['median_score']}/5")
    w(f"  С абзацами:         {st['with_paragraphs_pct']}%")
    w(f"  Со списками:        {st['with_lists_pct']}%")
    w(f"  С вопросами:        {st['with_questions_pct']}%")
    w(f"  Среднее предл/пост: {st['avg_sentences']}")
    w(f"  Ср. длина предл:    {st['avg_sent_length']} символов")
    w("")
    w("  Распределение баллов структуры:")
    for bucket, count in st["score_distribution"].items():
        bar = "#" * (count // 3)
        w(f"    {bucket:>5}: {count:>3} {bar}")
    w("")

    # ── Hooks ──
    w("10. ХУКИ (ПЕРВАЯ СТРОКА ПОСТА)")
    subsep()
    for hook_type, cnt in report["hooks"]["types"].items():
        labels = {
            "emoji_start": "Начало с emoji",
            "question_hook": "Вопрос-хук",
            "urgency_hook": "Срочность (внимание!)",
            "product_name_hook": "Название продукта",
            "short_emoji_hook": "Короткий + emoji",
            "conversational_hook": "Разговорный",
            "other": "Другое",
        }
        w(f"    {labels.get(hook_type, hook_type):>25}: {cnt}")
    w("")

    # ── Mentions ──
    w("11. УПОМИНАНИЯ")
    subsep()
    mn = report["mentions"]
    w(f"  Всего упоминаний: {mn['total_mentions']}")
    w(f"  Уникальных:       {mn['unique_accounts']}")
    for acc, cnt in mn["top_mentions"].items():
        w(f"    {acc}: {cnt}")
    w("")

    # ── Best posts ──
    w("12. ЛУЧШИЕ ПОСТЫ")
    subsep()

    def print_post_list(title: str, post_list: list[dict]):
        w(f"\n  {title}:")
        for i, p in enumerate(post_list, 1):
            w(f"    {i}. ID {p['id']} ({p['date']}) [{p['category']}]")
            w(f"       Длина: {p['length']}, Структура: {p['structure_score']}, Casual: {p['casual_score']}")
            w(f"       CTA: {p['ctas']}, Продукты: {p['products']}")
            preview = p["text_preview"].replace("\n", " ")[:150]
            w(f"       >>> {preview}...")

    print_post_list("Самые структурированные", report["best_posts"]["most_structured"])
    print_post_list("Самый разговорный тон", report["best_posts"]["most_casual"])
    print_post_list("Самые длинные", report["best_posts"]["longest"])
    print_post_list("Лучшие по совокупности", report["best_posts"]["best_overall"])
    w("")

    # ── Brand voice ──
    w("13. СООТВЕТСТВИЕ БРЕНД-ГОЛОСУ")
    subsep()
    bv = report["brand_voice"]
    w(f"  Соответствующих постов: {bv['compliant_posts']} ({bv['compliance_rate_pct']}%)")
    w("")
    w("  Проблемы:")
    for issue, cnt in bv["issues"].items():
        labels = {
            "formal_language": "Формальный язык",
            "no_emoji_in_long_post": "Длинный пост без emoji",
            "no_paragraphs_in_long_post": "Длинный пост без абзацев",
            "formal_вы_addressing": "Обращение на 'вы' (не для объявлений)",
            "long_post_no_casual_tone": "Длинный пост без casual-тона",
        }
        w(f"    {labels.get(issue, issue):>45}: {cnt}")
    w("")

    # ── Recommendations ──
    w("14. РЕКОМЕНДАЦИИ")
    sep()
    for i, rec in enumerate(bv["recommendations"], 1):
        w(f"  {i}. {rec}")
    w("")

    # ── Conclusion ──
    sep()
    w("  КЛЮЧЕВЫЕ ВЫВОДЫ")
    sep()
    w("")

    cat_stats = report["categories"]
    top_cat = max(cat_stats, key=lambda c: cat_stats[c]["count"])
    top_cat_pct = cat_stats[top_cat]["pct"]

    w(f"  1. Доминирующая категория: {top_cat} ({top_cat_pct}%)")
    w(f"     Канал сильно смещён в сторону промо-контента.")
    w("")
    w(f"  2. Тон канала: {report['tone']['casual_posts_pct']}% постов с casual-маркерами.")
    w(f"     Для ЦА 18-30 это недостаточно — нужно минимум 40-50%.")
    w("")
    w(f"  3. Структура: средний балл {report['structure']['avg_score']}/5.")
    w(f"     Хорошие посты используют: emoji-буллиты, абзацы, вопросы в конце.")
    w("")
    prod_top = list(report['products']['product_frequency'].items())[:3]
    w(f"  4. Продукты: топ-3 — {', '.join(f'{n}({c})' for n, c in prod_top)}.")
    w(f"     Ротация недостаточная — много продуктов упоминаются <5 раз.")
    w("")
    w(f"  5. CTA: {report['cta']['cta_rate_pct']}% постов содержат призыв к действию.")
    w(f"     Самые частые: {', '.join(list(report['cta']['cta_frequency'].keys())[:3])}.")
    w("")
    w(f"  6. Ритм: ~{report['posting_rhythm']['posts_per_week_avg']} постов/неделю,")
    w(f"     медианный интервал {report['posting_rhythm']['median_gap_hours']} часов.")
    w("")
    w(f"  7. Медиа: {report['overview']['media_rate']}% постов с медиа — хороший показатель.")
    w("")

    sep()
    w(f"  Отчёт сгенерирован: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    w(f"  JSON-версия: {OUTPUT_JSON.name}")
    sep()

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────

def main():
    print(f"Загрузка данных из {INPUT_FILE}...")
    posts = load_posts()
    print(f"Загружено {len(posts)} постов.")

    print("Анализ...")
    report = analyze(posts)

    # Save JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    print(f"JSON-отчёт: {OUTPUT_JSON}")

    # Save text
    text_report = generate_text_report(report, posts)
    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        f.write(text_report)
    print(f"Текстовый отчёт: {OUTPUT_TXT}")

    print("Готово!")


if __name__ == "__main__":
    main()
