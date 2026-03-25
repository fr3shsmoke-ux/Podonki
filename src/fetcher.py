from google import genai
import os
import json
from dotenv import load_dotenv
from pathlib import Path

def run():
    load_dotenv(override=True)
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ ОШИБКА: API ключ не найден")
        return

    client = genai.Client(api_key=api_key)

    # 1. Автономный поиск доступной модели
    print("🔍 Поиск доступных моделей...")
    try:
        models = client.models.list()
        # Ищем любую модель, в названии которой есть 'flash'
        target_model = next((m.name for m in models if 'flash' in m.name.lower()), "gemini-1.5-flash")
        # Убираем префикс 'models/', если он есть
        model_name = target_model.split('/')[-1]
        print(f"✅ Использую модель: {model_name}")
    except Exception as e:
        print(f"⚠️ Не удалось получить список моделей, пробуем дефолт: {e}")
        model_name = "gemini-1.5-flash"

    # 2. Загрузка правил
    manifest_path = Path.home() / "Desktop" / "Projects" / "global_manifest.json"
    with open(manifest_path, 'r', encoding='utf-8-sig') as f:
        rules = json.load(f)
    
    config = rules['content_automation_rules']
    prompt = f"Действуй по правилам: {config}. Сгенерируй 10 поисковых запросов для Telegram по вейп-ритейлу РФ 2026. Только список через новую строку."
    
    try:
        response = client.models.generate_content(
            model=model_name, 
            contents=prompt
        )
        
        output_dir = Path("data")
        output_dir.mkdir(exist_ok=True)
        clean_text = response.text.strip().replace('```', '')
        
        with open(output_dir / "queries.txt", "w", encoding="utf-8") as f:
            f.write(clean_text)
        
        print("\n--- РЕЗУЛЬТАТ СГЕНЕРИРОВАН ---")
        print(clean_text)
        
    except Exception as e:
        print(f"❌ Критическая ошибка API: {e}")

if __name__ == "__main__":
    run()
