from google import genai
import os
import json
from dotenv import load_dotenv
from pathlib import Path

def run():
    # Загружаем переменные окружения
    load_dotenv()
    
    # Путь к манифесту
    manifest_path = Path.home() / "Desktop" / "Projects" / "global_manifest.json"
    
    if not manifest_path.exists():
        print(f"ОШИБКА: Манифест не найден по пути {manifest_path}")
        return

    with open(manifest_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ОШИБКА: GOOGLE_API_KEY не найден в .env")
        return

    client = genai.Client(api_key=api_key)
    
    config = rules['content_automation_rules']
    prompt = f"Действуй по правилам: {config}. Найди 10 актуальных брендов вейпов в РФ (март 2026) и сформируй 10 уникальных запросов для поиска в Telegram. Используй маркеры {config['markers']}. Выведи только список."
    
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )
    
    output_dir = Path("data")
    output_dir.mkdir(exist_ok=True)
    with open(output_dir / "queries.txt", "w", encoding="utf-8") as f:
        f.write(response.text.strip())
    
    print("--- УСПЕХ: Файл data/queries.txt создан ---")
    print(response.text.strip())

if __name__ == "__main__":
    run()
