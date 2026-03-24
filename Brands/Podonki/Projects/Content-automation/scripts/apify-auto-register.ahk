; AutoHotkey скрипт для автоматической регистрации на Apify через Google

#NoEnv
SetBatchLines -1
SetDefaultMouseSpeed 0

; Открываем Apify
Run https://apify.com/signup
Sleep 3000

; Ищем и кликаем на кнопку "Sign up with Google"
; Обычно это находится в центре экрана
MouseMove 960, 400
Sleep 500
Click

; Ждём окна Google Auth
Sleep 2000

; Кликаем на поле email Google
MouseMove 400, 300
Sleep 300
Click

; Набираем email (замени на свой)
Send your-email@gmail.com

; Tab и пароль
Sleep 500
Send {Tab}
Sleep 300
Send your-password

; Enter
Send {Enter}
Sleep 3000

; После логина Apify должен спросить что-то, ждём
Sleep 2000

; Если всё ок, откроется профиль - ищем API tokens
MouseMove 100, 100
Sleep 500

; Скрин для проверки
Send {PrintScreen}

MsgBox Регистрация завершена! Проверь скриншот.
