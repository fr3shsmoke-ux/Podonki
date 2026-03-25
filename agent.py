import os
import subprocess
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

def execute_command(command):
    try:
        result = subprocess.run(["powershell", "-Command", command], capture_output=True, text=True, encoding='cp866')
        return result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        return str(e)

def run_agent_task(task_description):
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    
    # Системный промпт для автономности
    sys_prompt = f"""
    Ты — автономный агент. Твоя задача: {task_description}.
    Ты можешь выполнять команды PowerShell. 
    Выдай ответ в формате JSON: {{"command": "команда_powershell", "reason": "зачем это делать"}}.
    Если задача выполнена, выдай {{"status": "completed"}}.
    """
    
    response = client.models.generate_content(model="gemini-1.5-flash", contents=sys_prompt)
    # Здесь логика парсинга JSON и выполнения (для краткости упрощено)
    print(f"🤖 Агент планирует действие: {response.text}")

if __name__ == "__main__":
    # Пример запуска: python agent.py "Создай папку test и закинь туда список файлов из Рабочего стола"
    import sys
    if len(sys.argv) > 1:
        run_agent_task(sys.argv[1])
