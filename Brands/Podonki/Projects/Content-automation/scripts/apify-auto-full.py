import asyncio
from playwright.async_api import async_playwright
import json
import time
import sys
import io
from pathlib import Path

# Исправляем кодировку для Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Импортируем менеджер учётных данных
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("credentials_manager", Path(__file__).parent / "credentials-manager.py")
credentials_manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(credentials_manager)
get_credentials = credentials_manager.get_credentials

async def register_and_get_token():
    """
    Автоматическая регистрация на Apify и получение API токена
    Требует ввода пароля вручную один раз
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("\n🚀 Запускаю автоматическую регистрацию на Apify\n")

        # Шаг 1: Открываем Apify Sign Up
        print("1️⃣  Открываю страницу регистрации Apify...")
        await page.goto("https://apify.com/signup")
        await page.wait_for_timeout(2000)

        # Шаг 2: Ищем кнопку "Sign up with Google"
        print("2️⃣  Ищу кнопку 'Sign up with Google'...")

        # Пробуем найти кнопку Google по разным селекторам
        google_buttons = await page.query_selector_all('button, a, [role="button"]')
        google_button_found = False

        for button in google_buttons:
            text = await button.text_content()
            if text and ('google' in text.lower() or 'sign up' in text.lower()):
                print(f"   ✓ Найдена кнопка: {text.strip()}")
                await button.click()
                google_button_found = True
                break

        if not google_button_found:
            print("   ⚠️  Кнопка Google не найдена. Ищу альтернативный способ...")
            # Пробуем найти iframe Google Auth
            try:
                await page.wait_for_selector('[name*="google"]', timeout=3000)
            except:
                pass

        # Шаг 3: Ждём Google Auth окна
        print("3️⃣  Жду открытия окна Google Auth...")
        await page.wait_for_timeout(3000)

        # Переходим на Google если нужно
        try:
            # Ищем поле email на странице Apify или Google
            email_input = await page.query_selector('input[type="email"], input[name*="email"], input[placeholder*="email"]')

            if email_input:
                print("4️⃣  Заполняю email...")
                creds = get_credentials()
                if not creds:
                    print("❌ Не удалось получить учётные данные")
                    return None

                await email_input.click()
                await email_input.fill(creds['email'])
                await page.wait_for_timeout(500)

                # Жмём Enter или ищем кнопку "Next"
                next_button = await page.query_selector('button:has-text("Next"), button:has-text("Continue")')
                if next_button:
                    await next_button.click()
                else:
                    await email_input.press('Enter')

                await page.wait_for_timeout(2000)

                print("5️⃣  🔐 ТРЕБУЕТСЯ ВВОД ПАРОЛЯ!")
                print("    └─ Введи пароль от Google в открывшемся окне браузера")
                print("    └─ После ввода пароля продолжу автоматически...")

                # Ждём завершения авторизации
                max_wait = 60
                for i in range(max_wait):
                    current_url = page.url
                    print(f"    Проверяю... ({i+1}s) URL: {current_url[:60]}...")

                    if 'apify.com' in current_url and 'signup' not in current_url:
                        print("    ✅ Авторизация успешна!")
                        break

                    await page.wait_for_timeout(1000)

                # Жмём кнопку согласия если есть
                await page.wait_for_timeout(2000)
                agree_buttons = await page.query_selector_all('button')
                for btn in agree_buttons:
                    text = await btn.text_content()
                    if text and any(word in text.lower() for word in ['continue', 'accept', 'agree', 'next']):
                        await btn.click()
                        await page.wait_for_timeout(1000)
                        break

        except Exception as e:
            print(f"   ⚠️  Ошибка при заполнении email: {e}")

        # Шаг 6: Ищем API токен в профиле
        print("6️⃣  Ищу API токен в профиле...")

        # Переходим на страницу settings
        try:
            await page.goto("https://apify.com/account/api-tokens", timeout=10000)
            await page.wait_for_timeout(2000)
        except:
            print("   ⚠️  Не могу перейти на страницу токенов. Жду ручного перехода...")
            print("   👉 Сам перейди в Settings → API Tokens")
            await page.wait_for_timeout(15000)

        # Ищем токен на странице
        print("7️⃣  Извлекаю API токен...")

        # Снимаем скриншот для проверки
        await page.screenshot(path="apify-tokens-page.png")
        print("   📸 Скриншот: apify-tokens-page.png")

        # Ищем текст токена разными способами
        try:
            # Способ 1: Ищем в input полях (часто там токены)
            inputs = await page.query_selector_all('input[type="text"], input[readonly]')
            tokens_found = []

            for inp in inputs:
                value = await inp.get_attribute('value')
                if value and len(value.strip()) > 30 and any(c.isalnum() for c in value):
                    tokens_found.append(value.strip())

            # Способ 2: Ищем в button или span элементах
            elements = await page.query_selector_all('button, span, code, div')
            for elem in elements:
                text = await elem.text_content()
                if text and len(text.strip()) > 50 and (
                    'apk_' in text or 'token' in text.lower() or
                    (len(text.strip()) > 100 and text.strip().isalnum())
                ):
                    tokens_found.append(text.strip())

            # Очищаем дубликаты
            tokens_found = list(set(tokens_found))

            if tokens_found:
                token = tokens_found[0]
                print(f"\n✅ УСПЕШНО! API Токен получен!")
                print(f"🔑 Токен: {token}\n")

                # Сохраняем в файл
                with open('.env.apify', 'w') as f:
                    f.write(f"APIFY_TOKEN={token}\n")

                print("📝 Токен сохранён в .env.apify\n")
                return token
            else:
                print("   ⚠️  Токен не найден автоматически в HTML")
                print("   👉 Откройте apify-tokens-page.png и скопируйте токен вручную")
                print("   👉 Вставьте токен в файл .env.apify в формате: APIFY_TOKEN=your_token_here")

        except Exception as e:
            print(f"   ⚠️  Ошибка при поиске токена: {e}")
            print("   👉 Копируй токен вручную из браузера")

        await browser.close()
        return None

async def main():
    print("\n" + "="*60)
    print("  APIFY AUTO-REGISTRATION & TOKEN EXTRACTOR")
    print("="*60 + "\n")

    token = await register_and_get_token()

    if token:
        print("="*60)
        print(f"✅ Готово! Используй этот токен в скриптах:")
        print(f"   export APIFY_TOKEN={token}")
        print("="*60 + "\n")
    else:
        print("⚠️  Не удалось получить токен автоматически")
        print("Введи его вручную в .env.apify файл\n")

if __name__ == "__main__":
    asyncio.run(main())
