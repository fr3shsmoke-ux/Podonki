# === ОПТИМИЗАЦИЯ СЕТИ ДЛЯ МАКСИМАЛЬНОЙ СКОРОСТИ ===
# Запускать от администратора!

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ОПТИМИЗАЦИЯ СЕТИ - НАЧАЛО" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- 1. DNS (Yandex DNS - работает с Дом.ру) ---
Write-Host "`n[1/6] DNS -> Yandex DNS (77.88.8.8)..." -ForegroundColor Yellow
$adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($adapter in $adapters) {
    Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses '77.88.8.8','77.88.8.1'
    Write-Host "  $($adapter.Name) -> Yandex DNS OK" -ForegroundColor Green
}
# Очистка DNS кеша
Clear-DnsClientCache
Write-Host "  DNS кеш очищен" -ForegroundColor Green

# --- 2. Оптимизация TCP/IP ---
Write-Host "`n[2/6] Оптимизация TCP/IP..." -ForegroundColor Yellow
# Автонастройка окна приёма
netsh int tcp set global autotuninglevel=normal
# ECN (Explicit Congestion Notification)
netsh int tcp set global ecncapability=enabled
# Direct Cache Access
netsh int tcp set global dca=enabled 2>$null
# TCP Chimney Offload
netsh int tcp set global chimney=enabled 2>$null
# Receive Side Scaling
netsh int tcp set global rss=enabled
# Timestamps
netsh int tcp set global timestamps=enabled
Write-Host "  TCP/IP оптимизирован" -ForegroundColor Green

# --- 3. Отключение лишних служб ---
Write-Host "`n[3/6] Отключение лишних служб..." -ForegroundColor Yellow
$services = @(
    @{Name='WSearch'; Desc='Windows Search (индексация)'},
    @{Name='SysMain'; Desc='SysMain/Superfetch (предзагрузка)'},
    @{Name='DiagTrack'; Desc='Телеметрия Microsoft'},
    @{Name='dmwappushservice'; Desc='Пуш-уведомления WAP'},
    @{Name='MapsBroker'; Desc='Загрузка карт'},
    @{Name='lfsvc'; Desc='Геолокация'},
    @{Name='RetailDemo'; Desc='Демо-режим магазина'},
    @{Name='WMPNetworkSvc'; Desc='Windows Media Player Network'}
)
foreach ($svc in $services) {
    $s = Get-Service -Name $svc.Name -ErrorAction SilentlyContinue
    if ($s) {
        Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
        Set-Service -Name $svc.Name -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Host "  $($svc.Desc) -> ОТКЛЮЧЕН" -ForegroundColor Green
    } else {
        Write-Host "  $($svc.Desc) -> не найден (ок)" -ForegroundColor DarkGray
    }
}

# --- 4. MTU оптимизация ---
Write-Host "`n[4/6] MTU оптимизация..." -ForegroundColor Yellow
foreach ($adapter in $adapters) {
    # MTU 1500 - стандарт для Ethernet
    netsh interface ipv4 set subinterface "$($adapter.Name)" mtu=1500 store=persistent 2>$null
    Write-Host "  $($adapter.Name) -> MTU 1500" -ForegroundColor Green
}

# --- 5. Отключение IPv6 ---
Write-Host "`n[5/6] Отключение IPv6..." -ForegroundColor Yellow
foreach ($adapter in $adapters) {
    Disable-NetAdapterBinding -Name $adapter.Name -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
    Write-Host "  $($adapter.Name) -> IPv6 ОТКЛЮЧЕН" -ForegroundColor Green
}
# Реестр: полное отключение IPv6
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' -Name 'DisabledComponents' -Value 0xFF -Type DWord -ErrorAction SilentlyContinue
Write-Host "  IPv6 в реестре -> ОТКЛЮЧЕН" -ForegroundColor Green

# --- 6. Буферизация сокетов ---
Write-Host "`n[6/6] Буферизация сокетов..." -ForegroundColor Yellow
# Увеличение буферов TCP
$tcpPath = 'HKLM:\SYSTEM\CurrentControlSet\Services\AFD\Parameters'
if (!(Test-Path $tcpPath)) { New-Item -Path $tcpPath -Force | Out-Null }
# Размер буфера по умолчанию (64KB)
Set-ItemProperty -Path $tcpPath -Name 'DefaultReceiveWindow' -Value 65536 -Type DWord
Set-ItemProperty -Path $tcpPath -Name 'DefaultSendWindow' -Value 65536 -Type DWord
# Увеличенный буфер для быстрых соединений
Set-ItemProperty -Path $tcpPath -Name 'LargeBufferSize' -Value 65536 -Type DWord
# Количество буферов
Set-ItemProperty -Path $tcpPath -Name 'MediumBufferSize' -Value 1504 -Type DWord
Set-ItemProperty -Path $tcpPath -Name 'SmallBufferSize' -Value 256 -Type DWord
Write-Host "  Буферы сокетов увеличены" -ForegroundColor Green

# --- Nagle algorithm (отключение для уменьшения задержки) ---
$tcpipPath = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters'
Set-ItemProperty -Path $tcpipPath -Name 'TcpNoDelay' -Value 1 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $tcpipPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $tcpipPath -Name 'TCPNoDelay' -Value 1 -Type DWord -ErrorAction SilentlyContinue
Write-Host "  Nagle отключён (меньше задержка)" -ForegroundColor Green

# === ИТОГ ===
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ВСЕ ОПТИМИЗАЦИИ ПРИМЕНЕНЫ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nИзменения:" -ForegroundColor White
Write-Host "  1. DNS -> Yandex (77.88.8.8)" -ForegroundColor White
Write-Host "  2. TCP/IP оптимизирован" -ForegroundColor White
Write-Host "  3. Лишние службы отключены" -ForegroundColor White
Write-Host "  4. MTU -> 1500" -ForegroundColor White
Write-Host "  5. IPv6 отключен" -ForegroundColor White
Write-Host "  6. Буферы сокетов увеличены" -ForegroundColor White
Write-Host "`n>>> ПЕРЕЗАГРУЗИ КОМПЬЮТЕР для полного эффекта <<<" -ForegroundColor Red
