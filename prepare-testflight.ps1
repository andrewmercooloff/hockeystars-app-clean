# Скрипт подготовки к TestFlight
# Запуск: .\prepare-testflight.ps1

Write-Host "🚀 Подготовка к TestFlight..." -ForegroundColor Cyan

# 1. Очистка
Write-Host "`n📦 Шаг 1: Очистка кеша и зависимостей..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .expo
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue ios/build
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue android/build
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue android/app/build
Remove-Item -Force -ErrorAction SilentlyContinue package-lock.json
Write-Host "✅ Очистка завершена" -ForegroundColor Green

# 2. Переустановка
Write-Host "`n📥 Шаг 2: Установка зависимостей..." -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при установке зависимостей!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Зависимости установлены" -ForegroundColor Green

# 3. Проверка версий
Write-Host "`n🔍 Шаг 3: Проверка версий критичных зависимостей..." -ForegroundColor Yellow
$versions = @(
    "react-native-reanimated",
    "react-native-worklets",
    "react-native-worklets-core",
    "react-native-gesture-handler"
)

foreach ($pkg in $versions) {
    $version = npm list $pkg --depth=0 2>$null | Select-String $pkg
    if ($version) {
        Write-Host "  $version" -ForegroundColor Cyan
    } else {
        Write-Host "  ⚠️  $pkg не найден" -ForegroundColor Yellow
    }
}

# 4. Обновление iOS pods
Write-Host "`n🍎 Шаг 4: Обновление iOS зависимостей..." -ForegroundColor Yellow
if (Test-Path "ios") {
    Push-Location ios
    pod install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка при установке pods!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "✅ iOS зависимости обновлены" -ForegroundColor Green
} else {
    Write-Host "⚠️  Папка ios не найдена, пропускаем" -ForegroundColor Yellow
}

# 5. Проверка конфигурации
Write-Host "`n⚙️  Шаг 5: Проверка конфигурации..." -ForegroundColor Yellow
$appJson = Get-Content app.json | ConvertFrom-Json
Write-Host "  Версия: $($appJson.expo.version)" -ForegroundColor Cyan
Write-Host "  Runtime Version: $($appJson.expo.runtimeVersion)" -ForegroundColor Cyan
Write-Host "  Bundle ID: $($appJson.expo.ios.bundleIdentifier)" -ForegroundColor Cyan

# 6. Финальная проверка
Write-Host "`n✅ Подготовка завершена!" -ForegroundColor Green
Write-Host "`n📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "  1. Протестируй локально: npm start" -ForegroundColor White
Write-Host "  2. Собери для TestFlight: eas build --platform ios --profile production --clear-cache" -ForegroundColor White
Write-Host "`n📚 Документация:" -ForegroundColor Cyan
Write-Host "  - TESTFLIGHT_PREPARATION.md - Полный чеклист" -ForegroundColor White
Write-Host "  - TESTFLIGHT_BUILD_GUIDE.md - Подробное руководство" -ForegroundColor White
Write-Host "  - FIXED_VERSIONS.md - Информация о версиях" -ForegroundColor White



