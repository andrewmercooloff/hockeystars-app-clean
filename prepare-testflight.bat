@echo off
REM Скрипт подготовки к сборке для TestFlight (Windows)
REM Использование: prepare-testflight.bat

echo 🚀 Начинаем подготовку к сборке для TestFlight...
echo.

REM 1. Проверка Node.js и npm
echo ✓ Проверка Node.js и npm...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js не установлен
    exit /b 1
)
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npm не установлен
    exit /b 1
)
node --version
npm --version
echo.

REM 2. Проверка EAS CLI
echo ✓ Проверка EAS CLI...
where eas >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ EAS CLI не установлен. Устанавливаем...
    npm install -g eas-cli
)
eas --version
echo.

REM 3. Очистка кеша и старых сборок
echo ✓ Очистка кеша и старых сборок...
if exist node_modules rmdir /s /q node_modules
if exist .expo rmdir /s /q .expo
if exist ios\build rmdir /s /q ios\build
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build
if exist .eas rmdir /s /q .eas
echo ✓ Кеш очищен
echo.

REM 4. Переустановка зависимостей
echo ✓ Переустановка зависимостей...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ✗ Ошибка при установке зависимостей
    exit /b 1
)
echo ✓ Зависимости установлены
echo.

REM 5. Проверка конфигурации
echo ✓ Проверка конфигурации...
if not exist app.json (
    echo ✗ app.json не найден
    exit /b 1
)
echo ✓ app.json найден
echo.

REM 6. Обновление iOS pods (если есть ios папка)
if exist ios (
    echo ✓ Обновление iOS pods...
    cd ios
    call pod install
    cd ..
    echo ✓ Pods обновлены
    echo.
)

REM 7. Проверка eas.json
if not exist eas.json (
    echo ⚠ eas.json не найден. Создайте его для настройки сборки
) else (
    echo ✓ eas.json найден
)
echo.

REM 8. Проверка наличия иконок и splash screen
if not exist assets\images\icon.png (
    echo ⚠ Иконка приложения не найдена: assets\images\icon.png
) else (
    echo ✓ Иконка приложения найдена
)

if not exist assets\images\splash-icon.png (
    echo ⚠ Splash screen не найден: assets\images\splash-icon.png
) else (
    echo ✓ Splash screen найден
)
echo.

REM 9. Финальная проверка
echo.
echo ✅ Подготовка завершена!
echo.
echo Следующие шаги:
echo 1. Убедись, что все изменения закоммичены: git status
echo 2. Запусти сборку: eas build --platform ios --profile production --clear-cache
echo 3. После сборки загрузи в TestFlight: eas submit --platform ios --profile production
echo.
echo ⚠ ВАЖНО: Протестируй приложение локально перед сборкой!
echo Запусти: npm start и проверь на реальном устройстве
echo.

pause

