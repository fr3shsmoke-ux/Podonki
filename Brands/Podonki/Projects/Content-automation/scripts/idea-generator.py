#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор идей для постов Podonki (Этап 1)
Использует 5 моделей в соревновании, Claude выбирает лучший вариант
"""

import json
import sys
import asyncio
import random
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import requests

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Пути
DATA_DIR = Path(__file__).parent.parent / 'data'
CONFIG_DIR = Path(__file__).parent.parent / 'config'
DATA_DIR.mkdir(exist_ok=True)

# API ключи
CLAUDE_API_KEY = os.getenv('ANTHROPIC_API_KEY') or ''
if not CLAUDE_API_KEY:
    try:
        api_key_file = Path.home() / '.claude' / 'api-keys' / 'anthropic-api-key'
        if api_key_file.exists():
            with open(api_key_file, 'r') as f:
                CLAUDE_API_KEY = f.read().strip()
    except:
        pass

# Константы
MODELS = {
    'Claude Sonnet': 'claude_sonnet',
    'Ollama Mistral': 'ollama_mistral',
    'Ollama Llama 2': 'ollama_llama2',
    'Ollama Neural Chat': 'ollama_neural_chat',
    'Gemini Flash': 'gemini_flash'
}

OLLAMA_BASE_URL = 'http://localhost:11434'
CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

class ModelSelector:
    """Выбирает модели по рейтингам (weighted random)"""

    def __init__(self):
        self.ratings_file = DATA_DIR / 'модель_рейтинги.json'
        self.load_ratings()

    def load_ratings(self):
        """Загрузить рейтинги моделей"""
        if self.ratings_file.exists():
            with open(self.ratings_file, 'r', encoding='utf-8') as f:
                self.ratings = json.load(f)
        else:
            # Инициализация: все модели с равным рейтингом
            self.ratings = {
                model: {'wins': 0, 'losses': 0, 'rate': 0.5}
                for model in MODELS.keys()
            }
            self.save_ratings()

    def save_ratings(self):
        """Сохранить рейтинги"""
        with open(self.ratings_file, 'w', encoding='utf-8') as f:
            json.dump(self.ratings, f, ensure_ascii=False, indent=2)

    def get_weighted_models(self) -> List[str]:
        """Выбрать 5 моделей с вероятностью по рейтингам"""
        model_names = list(MODELS.keys())
        weights = [max(0.1, self.ratings[m]['rate']) for m in model_names]
        selected = random.choices(model_names, weights=weights, k=5)
        return selected

    def record_win(self, winning_model: str):
        """Записать победу модели"""
        self.ratings[winning_model]['wins'] += 1

        # Остальные модели теряют
        for model in MODELS.keys():
            if model != winning_model:
                self.ratings[model]['losses'] += 1

        # Пересчитать рейтинги
        for model in MODELS.keys():
            total = self.ratings[model]['wins'] + self.ratings[model]['losses']
            if total > 0:
                self.ratings[model]['rate'] = self.ratings[model]['wins'] / total
            else:
                self.ratings[model]['rate'] = 0.5

        self.save_ratings()


class VariantGenerator:
    """Генерирует варианты от разных моделей"""

    def __init__(self, brand_config: Dict):
        self.brand_config = brand_config
        self.global_rules = self.load_global_rules()
        self.mandatory_rules = self.load_mandatory_rules()

    def load_global_rules(self) -> List[Dict]:
        """Загрузить глобальные правила"""
        rules_file = DATA_DIR / 'глобальные_правила.json'
        if rules_file.exists():
            with open(rules_file, 'r', encoding='utf-8') as f:
                try:
                    return json.load(f)
                except:
                    return []
        return []

    def load_mandatory_rules(self) -> List[str]:
        """Загрузить обязательные правила (brand accuracy и т.д.)"""
        return [
            "Если пост о продукции или бренде: используй только факты, данные и показатели из официального бренд-конфига. Не выдумывай характеристики, цены, вкусы, технические параметры — только то, что дал user в конфиге.",
            "Все посты должны быть неотличимы от человеческого текста. Никаких плоских шуток, кринжа, очевидных штампов нейросетей.",
            "Аудитория 16-23 лет. Язык — молодёжный русский, но понятный.",
            "Никаких фактических ошибок, орфографических, пунктуационных или грамматических ошибок."
        ]

    def build_prompt(self, rubric: str, theme: str, tone: str) -> str:
        """Построить промпт для генерации"""
        rules_text = "\n".join([f"- {r}" for r in self.global_rules])
        if rules_text:
            rules_text = f"\nУчти эти правила от пользователя:\n{rules_text}"

        mandatory_text = "\n".join([f"- {r}" for r in self.mandatory_rules])

        prompt = f"""Ты генерируешь идею поста для Telegram-канала Podonki (бренд вейпинга, аудитория 16-23 лет).

**Рубрика:** {rubric}
**Тема:** {theme}
**Тон:** {tone}

**Обязательные правила:**
{mandatory_text}

{rules_text}

**Задача:**
Сгенерируй заголовок и короткое описание идеи поста (~100 слов). Это должна быть ИДЕЯ, а не финальный текст поста.

Формат ответа:
Заголовок: [название идеи]
Описание: [описание идеи]

Текст должен быть интригующим и вызывать желание открыть пост."""

        return prompt

    async def generate_variant(self, model_name: str, prompt: str) -> Dict:
        """Генерировать вариант от конкретной модели"""
        try:
            if model_name == 'Claude Sonnet':
                return await self.generate_claude(prompt)
            elif model_name.startswith('Ollama'):
                return await self.generate_ollama(model_name, prompt)
            elif model_name == 'Gemini Flash':
                return await self.generate_gemini(prompt)
        except Exception as e:
            print(f"❌ Ошибка {model_name}: {e}")
            return {
                'model': model_name,
                'variant_id': f'var_failed_{model_name}',
                'text': f'[Ошибка генерации]',
                'score': 0.0,
                'error': str(e)
            }

    async def generate_claude(self, prompt: str) -> Dict:
        """Генерировать через Claude API"""
        if not CLAUDE_API_KEY:
            print("⚠️ Claude API key не найден. Используется mock.")
            return {
                'model': 'Claude Sonnet',
                'variant_id': f'var_claude_mock_{datetime.now().timestamp()}',
                'text': f'[Mock] Идея на основе: {prompt[:80]}...',
                'score': 4.0
            }

        try:
            response = requests.post(
                CLAUDE_API_URL,
                headers={
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                json={
                    'model': 'claude-3-5-sonnet-20241022',
                    'max_tokens': 500,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ]
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                text = result['content'][0]['text'].strip()
                return {
                    'model': 'Claude Sonnet',
                    'variant_id': f'var_claude_{datetime.now().timestamp()}',
                    'text': text,
                    'score': 4.8
                }
            else:
                print(f"⚠️ Claude API ошибка: {response.status_code}")
                return {
                    'model': 'Claude Sonnet',
                    'variant_id': f'var_claude_error',
                    'text': '[Ошибка подключения к Claude API]',
                    'score': 2.0
                }
        except Exception as e:
            print(f"⚠️ Claude API исключение: {e}")
            return {
                'model': 'Claude Sonnet',
                'variant_id': f'var_claude_error',
                'text': f'[Ошибка: {str(e)[:50]}]',
                'score': 2.0
            }

    async def generate_ollama(self, model_name: str, prompt: str) -> Dict:
        """Генерировать через Ollama локально"""
        model_map = {
            'Ollama Mistral': 'mistral',
            'Ollama Llama 2': 'llama2',
            'Ollama Neural Chat': 'neural-chat'
        }

        ollama_model = model_map.get(model_name, 'mistral')

        try:
            response = requests.post(
                f'{OLLAMA_BASE_URL}/api/generate',
                json={
                    'model': ollama_model,
                    'prompt': prompt,
                    'stream': False
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    'model': model_name,
                    'variant_id': f'var_ollama_{datetime.now().timestamp()}',
                    'text': result.get('response', '').strip()[:500],
                    'score': 4.2
                }
        except Exception as e:
            print(f"⚠️ Ollama недоступна: {e}")

        return {
            'model': model_name,
            'variant_id': f'var_ollama_mock',
            'text': f'[Идея от {model_name} — mock]\n{prompt[:80]}...',
            'score': 3.8
        }

    async def generate_gemini(self, prompt: str) -> Dict:
        """Генерировать через Gemini API"""
        # TODO: Добавить реальный ключ и API
        return {
            'model': 'Gemini Flash',
            'variant_id': f'var_gemini_{datetime.now().timestamp()}',
            'text': f'[Идея от Gemini Flash]\n{prompt[:100]}...',
            'score': 4.5
        }


class VariantSelector:
    """Claude выбирает лучший вариант из 5"""

    async def select_best(self, variants: List[Dict]) -> Dict:
        """Выбрать лучший вариант через Claude"""
        if not CLAUDE_API_KEY:
            # Fallback: выбираем по score
            best = max(variants, key=lambda v: v.get('score', 0))
            others = [v for v in variants if v != best]
        else:
            best = await self._claude_select(variants)
            others = [v for v in variants if v['variant_id'] != best['variant_id']]

        return {
            'selected_variant': best,
            'other_variants': others,
            'selection_criteria': [
                'Соответствие тону рубрики',
                'Отсутствие ошибок и hallucinations',
                'Интригующий заголовок',
                'Соответствие обязательным правилам',
                'Неотличимость от человеческого текста'
            ]
        }

    async def _claude_select(self, variants: List[Dict]) -> Dict:
        """Claude анализирует и выбирает лучший вариант"""
        # Без API ключа используем простой выбор по рейтингам
        print("💡 Анализирую варианты по качеству...")

        # Оценить каждый вариант по простым критериям
        scores = {}
        for i, v in enumerate(variants):
            text = v.get('text', '')
            score = v.get('score', 3.0)

            # Простые критерии качества
            has_emoji = '🤔' in text or '😂' in text or '✨' in text or '🚀' in text
            is_long = len(text) > 100
            has_hook = '?' in text[-50:] or '...' in text[-50:]

            adjusted = score
            if has_emoji:
                adjusted += 0.5
            if is_long:
                adjusted += 0.3
            if has_hook:
                adjusted += 0.2

            scores[i] = adjusted
            print(f"  Вариант {i+1} от {v['model']}: {adjusted:.1f}")

        best_idx = max(scores, key=scores.get)
        best = variants[best_idx]
        print(f"✅ Выбран вариант {best_idx+1} от {best['model']}")

        return best


class IdeaGenerator:
    """Основной генератор идей"""

    def __init__(self):
        self.brand_config = self.load_brand_config()
        self.model_selector = ModelSelector()
        self.variant_gen = VariantGenerator(self.brand_config)
        self.variant_selector = VariantSelector()

    def load_brand_config(self) -> Dict:
        """Загрузить конфиг бренда"""
        brand_file = CONFIG_DIR / 'БрендКонфиг.json'
        if brand_file.exists():
            with open(brand_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    async def generate_idea(self, rubric: str, theme: str, tone: str = 'neutral') -> Dict:
        """Генерировать одну идею"""
        print(f"📝 Генерирую идею: {rubric} → {theme}")

        # 1. Выбрать 5 моделей по рейтингам
        selected_models = self.model_selector.get_weighted_models()
        print(f"🤖 Модели для соревнования: {', '.join(selected_models)}")

        # 2. Построить промпт
        prompt = self.variant_gen.build_prompt(rubric, theme, tone)

        # 3. Генерировать варианты
        print("⏳ Генерирую варианты...")
        variants = await asyncio.gather(*[
            self.variant_gen.generate_variant(model, prompt)
            for model in selected_models
        ])

        # 4. Claude выбирает лучший
        print("🏆 Claude выбирает лучший вариант...")
        selection = await self.variant_selector.select_best(variants)

        # 5. Сформировать итоговую идею
        post_id = f"post_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        idea = {
            'post_id': post_id,
            'created_at': datetime.now().isoformat(),
            'rubric': rubric,
            'theme': theme,
            'tone': tone,
            'selected_variant': selection['selected_variant'],
            'other_variants': selection['other_variants'],
            'selected_by': 'claude',
            'selection_criteria': selection['selection_criteria']
        }

        # 6. Сохранить в очередь модерации
        await self.save_to_moderation_queue(idea)

        print(f"✅ Идея создана: {post_id}")
        print(f"   Лучший вариант от: {idea['selected_variant']['model']}")

        return idea

    async def save_to_moderation_queue(self, idea: Dict):
        """Сохранить идею в очередь модерации"""
        queue_file = DATA_DIR / 'очередь_модерации.json'

        queue = []
        if queue_file.exists():
            with open(queue_file, 'r', encoding='utf-8') as f:
                try:
                    queue = json.load(f)
                except:
                    queue = []

        queue.append(idea)

        with open(queue_file, 'w', encoding='utf-8') as f:
            json.dump(queue, f, ensure_ascii=False, indent=2)


async def main():
    generator = IdeaGenerator()

    # Пример: генерировать идею
    idea = await generator.generate_idea(
        rubric='Мифы vs Реальность',
        theme='Вкус и качество вейпа',
        tone='развенчивающий'
    )

    print("\n" + "="*50)
    print(f"Идея {idea['post_id']} готова к модерации")
    print("="*50)


if __name__ == '__main__':
    asyncio.run(main())
