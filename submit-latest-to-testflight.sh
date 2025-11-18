#!/bin/bash

# Скрипт для отправки последней сборки iOS в TestFlight
# Использование: ./submit-latest-to-testflight.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

log "🚀 Отправка последней сборки в TestFlight..."

# 1. Проверка EAS CLI
log "Проверка EAS CLI..."
if ! command -v eas &> /dev/null; then
    warn "EAS CLI не установлен. Устанавливаем..."
    npm install -g eas-cli
fi
eas --version
echo

# 2. Проверка авторизации
log "Проверка авторизации в EAS..."
if ! eas whoami &> /dev/null; then
    error "Не авторизован в EAS. Выполните: eas login"
fi
log "✓ Авторизован в EAS"
echo

# 3. Поиск последней сборки iOS
log "Поиск последней сборки iOS..."
echo

# 4. Отправка последней сборки в TestFlight
log "Отправка последней сборки в TestFlight..."
echo
warn "⚠️  ВАЖНО: Используется последняя сборка iOS с профилем production"
warn "⚠️  Если сборка еще не завершена, скрипт найдет последнюю завершенную"
echo

if eas submit --platform ios --profile production --latest --non-interactive; then
    echo
    log "✅ Сборка успешно отправлена в TestFlight!"
    echo
    log "📱 Проверьте статус в App Store Connect:"
    echo "   https://appstoreconnect.apple.com/apps/6753738837/testflight/ios"
    echo
else
    echo
    error "❌ Ошибка при отправке сборки"
    echo
    echo "💡 Возможные причины:"
    echo "   - Нет завершенных сборок"
    echo "   - Сборка еще обрабатывается"
    echo "   - Проблемы с credentials"
    echo
    echo "💡 Попробуйте:"
    echo "   1. Проверить статус сборок: eas build:list --platform ios"
    echo "   2. Дождаться завершения сборки"
    echo "   3. Проверить credentials: eas credentials"
fi

echo
log "✅ Готово!"






