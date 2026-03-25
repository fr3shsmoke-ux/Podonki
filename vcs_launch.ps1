cd "$HOME\Desktop\Projects\Companies\Podonki\VapeWordsParser"
Write-Host "🚀 Запуск VCS Автоматизации..." -ForegroundColor Cyan
.\runner.ps1
Write-Host "✅ Все синхронизировано. Нажмите любую клавишу..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
