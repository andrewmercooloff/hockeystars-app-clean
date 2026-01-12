@echo off
REM Скрипт для удаления Node.js приложения через SSH

echo.
echo ========================================
echo Удаление Node.js приложения из cPanel
echo ========================================
echo.

set /p USERNAME="Введите ваш cPanel username: "

if "%USERNAME%"=="" (
    echo Ошибка: Username не может быть пустым!
    pause
    exit /b 1
)

echo.
echo Подключение: %USERNAME%@hockey-stars.com
echo.

REM Выполняем команды через SSH
ssh %USERNAME%@hockey-stars.com "pkill -u $(whoami) node 2>/dev/null; rm -rf ~/nodevenv/hockey-stars.com 2>/dev/null; if [ -d ~/public_html/api ]; then mv ~/public_html/api ~/public_html/api_old_backup && echo Переименовано api/; elif [ -d ~/domains/hockey-stars.com/public_html/api ]; then mv ~/domains/hockey-stars.com/public_html/api ~/domains/hockey-stars.com/public_html/api_old_backup && echo Переименовано api/; fi; echo Готово!"

echo.
echo ========================================
echo Команды выполнены!
echo ========================================
echo.
echo Следующие шаги:
echo 1. Откройте cPanel -^> Node.js менеджер
echo 2. Попробуйте удалить старое приложение
echo 3. Создайте новое приложение:
echo    - Application Root: api/
echo    - Application URL: /app
echo    - Application Startup File: app.js
echo.
pause










