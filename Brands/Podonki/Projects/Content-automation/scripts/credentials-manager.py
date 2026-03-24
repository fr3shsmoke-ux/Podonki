#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Менеджер учётных данных — безопасно сохраняет и использует почту/пароль
для автоматической регистрации на сайтах
"""

import os
import json
import getpass
import sys
import io
from pathlib import Path

# Исправляем кодировку для Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CREDS_FILE = Path.home() / '.podonki_creds'

def save_credentials(email, password):
    """Сохранить учётные данные в локальный файл"""
    # Создаём JSON с учётными данными
    creds = {
        'email': email,
        'password': password,
        'services': {
            'apify': {'registered': False, 'token': None},
            'telegram': {'registered': False, 'session': None}
        }
    }

    # Сохраняем с ограниченными правами доступа (только владелец может читать)
    with open(CREDS_FILE, 'w') as f:
        json.dump(creds, f, indent=2)

    # На Unix/Linux ставим права 600 (только владелец)
    os.chmod(CREDS_FILE, 0o600)
    print(f"✅ Учётные данные сохранены в {CREDS_FILE}")

def load_credentials():
    """Загрузить учётные данные"""
    if not CREDS_FILE.exists():
        return None

    with open(CREDS_FILE, 'r') as f:
        return json.load(f)

def setup_credentials():
    """Первая настройка — запросить почту и пароль"""
    print("\n" + "="*60)
    print("  ПЕРВАЯ НАСТРОЙКА УЧЁТНЫХ ДАННЫХ")
    print("="*60 + "\n")

    print("⚠️  Учётные данные будут сохранены локально (только ты их видишь)")
    print("📁 Файл: ~/.podonki_creds\n")

    email = input("📧 Введи email для регистрации на сервисах: ").strip()
    password = getpass.getpass("🔐 Введи пароль (не будет показано): ")

    if not email or not password:
        print("❌ Email и пароль обязательны!")
        return None

    save_credentials(email, password)
    return {'email': email, 'password': password}

def get_credentials():
    """Получить учётные данные (запросить если их нет)"""
    creds = load_credentials()

    if not creds:
        print("\n⚠️  Учётные данные не найдены. Нужно их настроить.\n")
        creds_dict = setup_credentials()
        if creds_dict:
            return creds_dict
        return None

    return {'email': creds['email'], 'password': creds['password']}

def clear_credentials():
    """Удалить сохранённые учётные данные"""
    if CREDS_FILE.exists():
        CREDS_FILE.unlink()
        print(f"✅ Учётные данные удалены из {CREDS_FILE}")
    else:
        print("ℹ️  Учётные данные не найдены")

# CLI для управления
if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == 'setup':
            setup_credentials()
        elif sys.argv[1] == 'clear':
            clear_credentials()
        elif sys.argv[1] == 'show':
            creds = load_credentials()
            if creds:
                print(f"Email: {creds['email']}")
            else:
                print("Учётные данные не найдены")
    else:
        # По умолчанию — получить учётные данные
        creds = get_credentials()
        if creds:
            print(f"\n✅ Используются учётные данные для: {creds['email']}")
