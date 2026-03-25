Write-Host "🚀 ЗАПУСК АВТОНОМНОГО ЦИКЛА..." -ForegroundColor Cyan

# 1. Генерация запросов
Write-Host "1. Генерация 10 запросов..." -ForegroundColor Yellow
python src\fetcher.py

# 2. Проверка и вывод
if (Test-Path "data\queries.txt") {
    Write-Host "✅ ГОТОВЫЕ ЗАПРОСЫ:" -ForegroundColor Green
    Get-Content "data\queries.txt"
}

# 3. GitHub Sync
Write-Host "2. Синхронизация с GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Auto-sync $(Get-Date -Format 'HH:mm')"
git push origin main

Write-Host "🏁 ЦИКЛ ЗАВЕРШЕН!" -ForegroundColor Cyan
