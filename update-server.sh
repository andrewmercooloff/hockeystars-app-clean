#!/bin/bash

echo "🔄 Обновляем сервер на DigitalOcean..."

# Подключаемся к серверу и выполняем команды
ssh root@157.230.26.197 << 'EOF'
echo "📁 Переходим в папку проекта..."
cd hockeystars-app

echo "🔄 Обновляем код из GitHub..."
git pull origin main

echo "📦 Переходим в папку сервера..."
cd instead/server

echo "📦 Устанавливаем зависимости..."
npm install

echo "🔄 Перезапускаем PM2 процесс..."
pm2 restart hockeystars

echo "📊 Проверяем статус..."
pm2 status

echo "📋 Показываем логи..."
pm2 logs hockeystars --lines 5

echo "✅ Обновление завершено!"
EOF

echo "🎉 Сервер обновлен!" 