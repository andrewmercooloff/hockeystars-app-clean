#!/bin/bash

# Скрипт подготовки к сборке для TestFlight
# Использование: ./prepare-testflight.sh

set -e

echo "🚀 Начинаем подготовку к сборке для TestFlight..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# 1. Проверка Node.js и npm
info "Проверка Node.js и npm..."
if ! command -v node &> /dev/null; then
    error "Node.js не установлен"
fi
if ! command -v npm &> /dev/null; then
    error "npm не установлен"
fi
info "Node.js: $(node --version)"
info "npm: $(npm --version)"

# 2. Проверка EAS CLI
info "Проверка EAS CLI..."
if ! command -v eas &> /dev/null; then
    warn "EAS CLI не установлен. Устанавливаем..."
    npm install -g eas-cli
fi
info "EAS CLI: $(eas --version)"

# 3. Очистка кеша и старых сборок
info "Очистка кеша и старых сборок..."
rm -rf node_modules
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build
rm -rf .eas
info "Кеш очищен"

# 4. Переустановка зависимостей
info "Переустановка зависимостей..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    error "Ошибка при установке зависимостей"
fi
info "Зависимости установлены"

# 5. Проверка конфигурации
info "Проверка конфигурации..."

# Проверка app.json
if [ ! -f "app.json" ]; then
    error "app.json не найден"
fi

# Проверка версии
VERSION=$(node -p "require('./app.json').expo.version")
BUILD_NUMBER=$(node -p "require('./app.json').expo.ios.buildNumber || 'auto'")
info "Версия: $VERSION"
info "Build number: $BUILD_NUMBER"

# Проверка bundle identifier
BUNDLE_ID=$(node -p "require('./app.json').expo.ios.bundleIdentifier")
info "Bundle ID: $BUNDLE_ID"

# Проверка разрешений
MIC_PERMISSION=$(node -p "require('./app.json').expo.ios.infoPlist.NSMicrophoneUsageDescription || 'не указано'")
if [ "$MIC_PERMISSION" == "не указано" ]; then
    warn "Разрешение на микрофон не указано в app.json"
else
    info "Разрешение на микрофон: указано"
fi

# 6. Обновление iOS pods (если есть ios папка)
if [ -d "ios" ]; then
    info "Обновление iOS pods..."
    cd ios
    pod install
    cd ..
    info "Pods обновлены"
fi

# 7. Проверка eas.json
if [ ! -f "eas.json" ]; then
    warn "eas.json не найден. Создайте его для настройки сборки"
else
    info "eas.json найден"
fi

# 8. Проверка наличия иконок и splash screen
if [ ! -f "assets/images/icon.png" ]; then
    warn "Иконка приложения не найдена: assets/images/icon.png"
else
    info "Иконка приложения найдена"
fi

if [ ! -f "assets/images/splash-icon.png" ]; then
    warn "Splash screen не найден: assets/images/splash-icon.png"
else
    info "Splash screen найден"
fi

# 9. Проверка TypeScript ошибок
info "Проверка TypeScript..."
if command -v tsc &> /dev/null; then
    npx tsc --noEmit || warn "Найдены ошибки TypeScript (проверьте вручную)"
else
    warn "TypeScript не установлен, пропускаем проверку"
fi

# 10. Финальная проверка
echo ""
info "✅ Подготовка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Убедись, что все изменения закоммичены: git status"
echo "2. Запусти сборку: eas build --platform ios --profile production --clear-cache"
echo "3. После сборки загрузи в TestFlight: eas submit --platform ios --profile production"
echo ""
warn "ВАЖНО: Протестируй приложение локально перед сборкой!"
echo "Запусти: npm start и проверь на реальном устройстве"

