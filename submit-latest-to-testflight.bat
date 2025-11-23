@echo off
REM Скрипт для отправки последней сборки iOS в TestFlight
REM Использование: submit-latest-to-testflight.bat

echo 🚀 Отправка последней сборки в TestFlight...
echo.

REM 1. Проверка EAS CLI
echo ✓ Проверка EAS CLI...
where eas >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ EAS CLI не установлен. Устанавливаем...
    npm install -g eas-cli
)
eas --version
echo.

REM 2. Проверка авторизации
echo ✓ Проверка авторизации в EAS...
eas whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Не авторизован в EAS. Выполните: eas login
    exit /b 1
)
echo ✓ Авторизован в EAS
echo.

REM 3. Поиск последней сборки iOS
echo ✓ Поиск последней сборки iOS...
echo.

REM 4. Отправка последней сборки в TestFlight
echo ✓ Отправка последней сборки в TestFlight...
echo.
echo ⚠️  ВАЖНО: Используется последняя сборка iOS с профилем production
echo ⚠️  Если сборка еще не завершена, скрипт найдет последнюю завершенную
echo.

eas submit --platform ios --profile production --latest --non-interactive

if %errorlevel% equ 0 (
    echo.
    echo ✅ Сборка успешно отправлена в TestFlight!
    echo.
    echo 📱 Проверьте статус в App Store Connect:
    echo    https://appstoreconnect.apple.com/apps/6753738837/testflight/ios
    echo.
) else (
    echo.
    echo ❌ Ошибка при отправке сборки
    echo.
    echo 💡 Возможные причины:
    echo    - Нет завершенных сборок
    echo    - Сборка еще обрабатывается
    echo    - Проблемы с credentials
    echo.
    echo 💡 Попробуйте:
    echo    1. Проверить статус сборок: eas build:list --platform ios
    echo    2. Дождаться завершения сборки
    echo    3. Проверить credentials: eas credentials
    exit /b 1
)

echo.
echo ✅ Готово!









