# Скрипт для настройки Android credentials для EAS Build
# Запустите этот скрипт один раз для настройки keystore

Write-Host "Настройка Android credentials для EAS Build..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Этот скрипт запустит интерактивную настройку keystore." -ForegroundColor Yellow
Write-Host "Выберите:" -ForegroundColor Yellow
Write-Host "  1. Set up a new keystore (создать новый)" -ForegroundColor Green
Write-Host "  2. Use existing keystore (использовать существующий)" -ForegroundColor Green
Write-Host ""
Write-Host "Для production сборок рекомендуется создать новый keystore." -ForegroundColor Yellow
Write-Host ""

# Запускаем настройку credentials
eas credentials --platform android

Write-Host ""
Write-Host "После настройки credentials можно использовать:" -ForegroundColor Cyan
Write-Host "  eas build --platform android --profile production --auto-submit --non-interactive" -ForegroundColor Green
Write-Host ""











































