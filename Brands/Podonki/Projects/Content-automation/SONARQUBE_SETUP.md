# Настройка SonarQube + GitHub Actions

## 1. GitHub Secrets

Добавь в репо Settings → Secrets and variables → Actions:

```
SONAR_HOST_URL = https://sonarqube.yourserver.com
SONAR_TOKEN = <токен из SonarQube>
```

### Где получить SONAR_TOKEN:
1. Открой SonarQube
2. Account (右角) → My Account → Security → Generate Tokens
3. Скопируй токен в SONAR_TOKEN

## 2. Как это работает

- **На push в main/develop**: автоматически запускается анализ
- **На pull_request**: проверяется качество кода перед мерджем
- **Запускает**: тесты → ESLint → SonarQube Scan → Quality Gate

## 3. Результаты

После каждого push:
- Перейди в Actions вкладке репо
- Посмотри SonarQube Scan результат
- Качество кода в SonarQube dashboard

## 4. Локально (опционально)

Запусти перед коммитом:
```bash
npm run lint:fix
npm run format
npm test
```

## 5. Что проверяется

✅ Code coverage (тесты)
✅ Code smells (плохие паттерны)
✅ Security issues
✅ Unused variables, console.logs
✅ Formatting (ESLint + Prettier)
