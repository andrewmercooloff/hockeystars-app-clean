#!/bin/bash

# Скрипт для исправления проблем с react-native-worklets
# Использование: bash fix-worklets.sh

echo "🧹 Очистка node_modules и кеша..."

# Удаляем node_modules
rm -rf node_modules

# Удаляем lock файлы
rm -f package-lock.json
rm -f yarn.lock

# Очищаем npm кеш
npm cache clean --force

echo "📦 Переустановка зависимостей..."
npm install

echo "🔄 Очистка кеша Metro и Expo..."
npx expo start --clear

echo "✅ Готово! Перезапустите приложение."







