#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Автоматическая регистрация на основных сервисах
Использует одну почту и пароль для всех регистраций
"""

import asyncio
import json
import sys
import io
from pathlib import Path
from playwright.async_api import async_playwright

# UTF-8 fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Учётные данные
EMAIL = "Fr3shsmoke@gmail.com"
PASSWORD = "gnde dftu rmpv jazh"

# Сервисы для регистрации
SERVICES = {
    'apify': {
        'name': 'Apify',
        'url': 'https://apify.com/signup',
        'email_selector': 'input[type="email"]',
        'password_selector': 'input[type="password"]',
        'submit_selector': 'button[type="submit"]'
    },
    'polza': {
        'name': 'Polza.ai',
        'url': 'https://polza.ai/register',
        'email_selector': 'input[type="email"]',
        'password_selector': 'input[type="password"]',
        'submit_selector': 'button[type="submit"]'
    },
    'n8n': {
        'name': 'n8n Cloud',
        'url': 'https://app.n8n.cloud/register',
        'email_selector': 'input[type="email"]',
        'password_selector': 'input[type="password"]',
        'submit_selector': 'button[type="submit"]'
    }
}

async def register_service(service_name, service_config):
    """Регистрация на одном сервисе"""
    print(f"\n📝 Регистрирую на {service_config['name']}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            # Переходим на сайт
            print(f"  🔗 Открываю {service_config['url']}")
            await page.goto(service_config['url'], timeout=30000)
            await asyncio.sleep(2)

            # Заполняем email
            email_input = await page.query_selector(service_config['email_selector'])
            if email_input:
                print(f"  ✍️  Заполняю email...")
                await email_input.click()
                await email_input.fill(EMAIL)
                await asyncio.sleep(0.5)

            # Заполняем пароль
            password_input = await page.query_selector(service_config['password_selector'])
            if password_input:
                print(f"  ✍️  Заполняю пароль...")
                await password_input.click()
                await password_input.fill(PASSWORD)
                await asyncio.sleep(0.5)

            # Нажимаем кнопку регистрации
            submit_button = await page.query_selector(service_config['submit_selector'])
            if submit_button:
                print(f"  🚀 Отправляю форму...")
                await submit_button.click()
                await asyncio.sleep(3)

            # Проверяем что произошло
            url = page.url
            screenshot = f"{service_name}-registration.png"
            await page.screenshot(path=screenshot)

            if "success" in url.lower() or "dashboard" in url.lower():
                print(f"  ✅ Регистрация успешна!")
                return {'status': 'success', 'screenshot': screenshot}
            else:
                print(f"  ⚠️  Статус неизвестен. Скриншот: {screenshot}")
                return {'status': 'unknown', 'screenshot': screenshot}

        except Exception as e:
            print(f"  ❌ Ошибка: {str(e)}")
            return {'status': 'error', 'error': str(e)}

        finally:
            await browser.close()

async def main():
    print("=" * 60)
    print("  AUTO-REGISTRATION SERVICE")
    print("=" * 60)
    print(f"\nПочта: {EMAIL}")
    print(f"Пароль: {PASSWORD}")

    results = {}

    for service_id, service_config in SERVICES.items():
        try:
            result = await register_service(service_id, service_config)
            results[service_id] = result
        except Exception as e:
            print(f"❌ Критическая ошибка при регистрации на {service_config['name']}: {e}")
            results[service_id] = {'status': 'critical_error', 'error': str(e)}

    # Сохраняем результаты
    output_file = 'registration-results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"📊 РЕЗУЛЬТАТЫ")
    print(f"{'='*60}")
    for service, result in results.items():
        status = result.get('status', 'unknown')
        icon = '✅' if status == 'success' else '⚠️' if status == 'unknown' else '❌'
        print(f"{icon} {SERVICES[service]['name']}: {status}")

    print(f"\n💾 Подробные результаты в {output_file}")

if __name__ == '__main__':
    asyncio.run(main())
