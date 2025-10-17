#!/bin/bash

# Скрипт для сборки и публикации HockeyStars
# Использование: ./scripts/build-and-publish.sh [android|ios|both]

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

# Проверка аргументов
if [ $# -eq 0 ]; then
    error "Укажите платформу: android, ios или both"
fi

PLATFORM=$1

# Проверка наличия EAS CLI
if ! command -v eas &> /dev/null; then
    error "EAS CLI не установлен. Установите: npm install -g eas-cli"
fi

# Проверка авторизации
if ! eas whoami &> /dev/null; then
    error "Не авторизован в EAS. Выполните: eas login"
fi

log "Начинаем процесс сборки и публикации для платформы: $PLATFORM"

# Функция для сборки Android
build_android() {
    log "Сборка Android приложения..."
    
    # Сборка AAB для Google Play
    log "Создание AAB для Google Play..."
    eas build --platform android --profile production --non-interactive
    
    # Сборка APK для тестирования
    log "Создание APK для тестирования..."
    eas build --platform android --profile apk --non-interactive
    
    log "Android сборка завершена"
}

# Функция для сборки iOS
build_ios() {
    log "Сборка iOS приложения..."
    
    # Сборка для App Store
    log "Создание IPA для App Store..."
    eas build --platform ios --profile production --non-interactive
    
    log "iOS сборка завершена"
}

# Функция для публикации Android
publish_android() {
    log "Публикация в Google Play Store..."
    
    if [ -f "./google-service-account.json" ]; then
        eas submit --platform android --profile production --non-interactive
        log "Android приложение отправлено в Google Play Store"
    else
        warn "Файл google-service-account.json не найден. Публикация пропущена."
        warn "Создайте Google Service Account и добавьте файл в корень проекта"
    fi
}

# Функция для публикации iOS
publish_ios() {
    log "Публикация в App Store..."
    
    # Проверяем, настроены ли данные для iOS
    if grep -q "your-apple-id@example.com" eas.json; then
        warn "iOS данные не настроены. Публикация пропущена."
        warn "Обновите eas.json с вашими Apple ID данными"
    else
        eas submit --platform ios --profile production --non-interactive
        log "iOS приложение отправлено в App Store"
    fi
}

# Основная логика
case $PLATFORM in
    "android")
        build_android
        read -p "Опубликовать в Google Play Store? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            publish_android
        fi
        ;;
    "ios")
        build_ios
        read -p "Опубликовать в App Store? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            publish_ios
        fi
        ;;
    "both")
        build_android
        build_ios
        
        read -p "Опубликовать в Google Play Store? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            publish_android
        fi
        
        read -p "Опубликовать в App Store? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            publish_ios
        fi
        ;;
    *)
        error "Неизвестная платформа: $PLATFORM. Используйте: android, ios или both"
        ;;
esac

log "Процесс завершен успешно!"
