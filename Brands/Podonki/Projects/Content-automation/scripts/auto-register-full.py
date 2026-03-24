#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Полная автоматическая регистрация с обработкой верификаций
Использует Playwright для заполнения форм и извлечения результатов
"""

import asyncio
import json
import sys
import io
import re
from pathlib import Path
from playwright.async_api import async_playwright

# UTF-8 fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EMAIL = "Fr3shsmoke@gmail.com"
PASSWORD = "gnde dftu rmpv jazh"

async def register_apify():
    """Регистрация на Apify через Google"""
    print("\n📝 Apify...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto('https://apify.com/signup', timeout=30000)
            await asyncio.sleep(2)

            # Нажимаем "Continue with Google"
            google_btn = await page.query_selector('button:has-text("Continue with Google")')
            if google_btn:
                print("  🔵 Нажимаю Google...")
                await google_btn.click()
                await asyncio.sleep(3)

                # Ищем инпут email Google
                email_input = await page.query_selector('input[type="email"]')
                if email_input:
                    print("  ✍️  Заполняю email...")
                    await email_input.fill(EMAIL)
                    await email_input.press('Enter')
                    await asyncio.sleep(2)

                    # Ищем инпут пароля
                    pwd_input = await page.query_selector('input[type="password"]')
                    if pwd_input:
                        print("  ✍️  Заполняю пароль...")
                        await pwd_input.fill(PASSWORD)
                        await pwd_input.press('Enter')
                        await asyncio.sleep(3)

            # Проверяем финальную страницу
            await asyncio.sleep(2)
            url = page.url
            await page.screenshot(path="apify-final.png")

            if "dashboard" in url or "workspace" in url:
                return {'status': 'success', 'url': url}
            else:
                return {'status': 'needs_verification', 'url': url, 'screenshot': 'apify-final.png'}

        except Exception as e:
            return {'status': 'error', 'error': str(e)}
        finally:
            await browser.close()

async def register_n8n():
    """Регистрация на n8n"""
    print("\n📝 n8n Cloud...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto('https://app.n8n.cloud/register', timeout=30000)
            await asyncio.sleep(2)

            # Заполняем email
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                print("  ✍️  Заполняю email...")
                await email_input.click()
                await email_input.fill(EMAIL)
                await asyncio.sleep(1)

            # Заполняем пароль
            pwd_input = await page.query_selector('input[type="password"]')
            if pwd_input:
                print("  ✍️  Заполняю пароль...")
                await pwd_input.click()
                await pwd_input.fill(PASSWORD)
                await asyncio.sleep(1)

            # Ищем кнопку Sign Up
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                print("  🚀 Отправляю...")
                await signup_btn.click()
                await asyncio.sleep(3)

            url = page.url
            await page.screenshot(path="n8n-final.png")

            if "verify" in url or "email" in url.lower():
                return {'status': 'needs_email_verification', 'url': url, 'screenshot': 'n8n-final.png'}
            elif "dashboard" in url or "workspace" in url:
                return {'status': 'success', 'url': url}
            else:
                return {'status': 'unknown', 'url': url, 'screenshot': 'n8n-final.png'}

        except Exception as e:
            return {'status': 'error', 'error': str(e)}
        finally:
            await browser.close()

async def register_github():
    """Регистрация на GitHub"""
    print("\n📝 GitHub...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto('https://github.com/signup', timeout=30000)
            await asyncio.sleep(2)

            # Email
            email_input = await page.query_selector('input#email')
            if email_input:
                print("  ✍️  Email...")
                await email_input.fill(EMAIL)
                await asyncio.sleep(1)

            # Пароль
            pwd_input = await page.query_selector('input#password')
            if pwd_input:
                print("  ✍️  Пароль...")
                await pwd_input.fill(PASSWORD)
                await asyncio.sleep(1)

            # Username (генерируем из email)
            username = EMAIL.split('@')[0]
            username_input = await page.query_selector('input#login')
            if username_input:
                print("  ✍️  Username...")
                await username_input.fill(username)
                await asyncio.sleep(1)

            # Create account
            create_btn = await page.query_selector('button[type="submit"]')
            if create_btn:
                print("  🚀 Отправляю...")
                await create_btn.click()
                await asyncio.sleep(3)

            url = page.url
            await page.screenshot(path="github-final.png")

            if "verify" in url or "check-email" in url:
                return {'status': 'needs_email_verification', 'url': url, 'screenshot': 'github-final.png'}
            else:
                return {'status': 'unknown', 'url': url, 'screenshot': 'github-final.png'}

        except Exception as e:
            return {'status': 'error', 'error': str(e)}
        finally:
            await browser.close()

async def main():
    print("=" * 60)
    print("  FULL AUTO-REGISTRATION")
    print("=" * 60)
    print(f"Email: {EMAIL}")

    results = {}

    # Apify
    results['apify'] = await register_apify()

    # n8n
    results['n8n'] = await register_n8n()

    # GitHub
    results['github'] = await register_github()

    # Сохраняем
    with open('registrations.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print("📊 РЕЗУЛЬТАТЫ")
    print(f"{'='*60}")
    for service, result in results.items():
        status = result.get('status', 'unknown')
        icon = '✅' if status == 'success' else '⏳' if 'verification' in status else '❌'
        print(f"{icon} {service.upper()}: {status}")

    print(f"\n💾 Подробно: registrations.json")

if __name__ == '__main__':
    asyncio.run(main())
