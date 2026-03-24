import asyncio
from playwright.async_api import async_playwright
import json

async def register_apify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("📱 Открываю Apify...")
        await page.goto("https://apify.com/signup")
        await page.wait_for_timeout(2000)

        # Генерируем уникальный email
        import time
        email = f"podonki_bot_{int(time.time())}@gmail.com"
        password = "TempPass123!Secure"

        print(f"✉️  Email: {email}")
        print(f"🔐 Password: {password}")

        # Заполняем форму
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)

        # Ищем кнопку регистрации
        buttons = await page.query_selector_all('button')
        for button in buttons:
            text = await button.text_content()
            if 'sign up' in text.lower() or 'register' in text.lower():
                await button.click()
                break

        print("⏳ Жду завершения регистрации...")
        await page.wait_for_timeout(3000)

        # Проверяем что мы в аккаунте
        try:
            await page.wait_for_url("**/dashboard**", timeout=5000)
            print("✅ Регистрация успешна!")
        except:
            print("⚠️  Может потребоваться подтверждение email")

        await page.screenshot(path="apify-registered.png")
        print("📸 Screenshot: apify-registered.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(register_apify())
