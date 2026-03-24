; Universal Auto-Registration Helper
; Помогает с автоматизацией заполнения форм на сайтах
; Горячие клавиши:
;   Ctrl+E - заполнить email
;   Ctrl+U - заполнить username
;   Ctrl+N - заполнить имя
;   Ctrl+P - переместить мышь на кнопку (для клика)
;   Ctrl+C - скопировать в буфер обмена (для токенов и ключей)

#NoEnv
SetBatchLines -1
SetDefaultMouseSpeed 0

; Переменные
global email := "your-email@gmail.com"
global username := "your-username"
global firstName := "Your"
global lastName := "Name"

; Hotkey: Ctrl+E - вставить email
^e::
{
    Send %email%
    ToolTip Email: %email%
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+U - вставить username
^u::
{
    Send %username%
    ToolTip Username: %username%
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+N - вставить имя
^n::
{
    Send %firstName%
    ToolTip First Name: %firstName%
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+L - вставить фамилию
^l::
{
    Send %lastName%
    ToolTip Last Name: %lastName%
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+M - показать помощь по позиционированию мышки
^m::
{
    MouseGetPos, xpos, ypos
    ToolTip Позиция мышки: X=%xpos% Y=%ypos%`nAlt+A для автоклика на этой позиции
    return
}
return

; Hotkey: Alt+A - кликнуть на текущую позицию мышки
!a::
{
    Click
    ToolTip Клик выполнен!
    SetTimer, RemoveToolTip, 1000
    return
}
return

; Hotkey: Ctrl+T - вставить в поле текущее время (для генерации уникальных значений)
^t::
{
    FormatTime, TimeString, , yyyyMMddHHmmss
    Send %TimeString%
    ToolTip Time: %TimeString%
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+G - открыть Google
^g::
{
    Run https://google.com
}
return

; Hotkey: Ctrl+A (Apify) - открыть Apify Sign Up
^+a::
{
    Run https://apify.com/signup
    ToolTip Apify signup page opened
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+S - скопировать текст из буфера (для вставки токенов)
^s::
{
    Send ^c
    Sleep 100
    ToolTip Скопировано в буфер обмена!
    SetTimer, RemoveToolTip, 2000
}
return

; Hotkey: Ctrl+H - показать справку
^h::
{
    MsgBox, 0, Auto-Register Helper,
    (
Горячие клавиши:
Ctrl+E  - Вставить email
Ctrl+U  - Вставить username
Ctrl+N  - Вставить имя
Ctrl+L  - Вставить фамилию
Ctrl+M  - Показать позицию мышки
Alt+A   - Кликнуть на текущей позиции
Ctrl+T  - Вставить текущее время
Ctrl+G  - Открыть Google
Ctrl+Shift+A - Открыть Apify Sign Up
Ctrl+S  - Скопировать из буфера
Ctrl+H  - Эта справка

Как использовать:
1. Откройте сайт
2. Нажимайте горячие клавиши для заполнения полей
3. Для паролей вводите вручную (Ctrl+H показывает подсказки)
4. Используйте Alt+A для кликов на кнопках
    )
}
return

; Функция удаления подсказки
RemoveToolTip:
ToolTip
return

; Экран выхода
Esc::
{
    MsgBox, 4, Выход?, Вы уверены что хотите выйти?
    IfMsgBox Yes
        ExitApp
}
return
