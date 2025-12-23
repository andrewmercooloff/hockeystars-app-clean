# Скрипт для создания Android APK для тестирования
# Использует preview профиль (не требует keystore для некоторых случаев)

Write-Host "Создание Android APK для тестирования..." -ForegroundColor Cyan
Write-Host ""

# Проверяем, настроены ли credentials
Write-Host "Проверка credentials..." -ForegroundColor Yellow

# Пытаемся создать preview сборку
# Если credentials не настроены, будет запрос на создание
eas build --platform android --profile preview

Write-Host ""
Write-Host "После завершения сборки APK будет доступен для скачивания." -ForegroundColor Green
Write-Host ""














































