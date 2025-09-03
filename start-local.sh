#!/bin/bash

echo "🚀 Запуск локальной среды HockeyStars..."

# Проверка наличия MongoDB
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB не установлен!"
    echo "📥 Установите MongoDB:"
    echo "   Windows: https://docs.mongodb.com/manual/installation/"
    echo "   macOS: brew install mongodb-community"
    echo "   Linux: sudo apt install mongodb"
    exit 1
fi

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "📥 Установите Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Проверка зависимостей завершена"

# Запуск MongoDB (если не запущен)
if ! pgrep -x "mongod" > /dev/null; then
    echo "🔄 Запуск MongoDB..."
    mongod --dbpath ./data/db &
    sleep 3
fi

# Установка зависимостей сервера
echo "📦 Установка зависимостей сервера..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
fi

# Создание .env файла если не существует
if [ ! -f ".env" ]; then
    echo "📝 Создание .env файла..."
    cp env.example .env
    echo "⚠️  Отредактируйте .env файл в папке server/"
fi

# Запуск сервера
echo "🌐 Запуск API сервера..."
npm run dev &
SERVER_PID=$!

cd ..

# Установка зависимостей клиента
echo "📱 Установка зависимостей клиента..."
if [ ! -d "node_modules" ]; then
    npm install
fi

# Создание .env файла для клиента если не существует
if [ ! -f ".env" ]; then
    echo "📝 Создание .env файла для клиента..."
    cat > .env << EOF
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
EOF
fi

# Запуск клиента
echo "📱 Запуск клиентского приложения..."
npm start

# Очистка при завершении
trap "echo '🛑 Остановка серверов...'; kill $SERVER_PID; exit" INT 