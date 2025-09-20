#!/bin/bash

echo "🚀 Запускаем Email Server для HockeyStars..."

# Проверяем существование .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден!"
    echo "📝 Создайте файл .env с настройками Gmail:"
    echo ""
    echo "EMAIL_PROVIDER=gmail"
    echo "GMAIL_USER=your-email@gmail.com"
    echo "GMAIL_APP_PASSWORD=your-16-char-app-password"
    echo "FROM_EMAIL=your-email@gmail.com"
    echo "EMAIL_SERVER_PORT=3001"
    echo ""
    echo "📚 Подробные инструкции: EMAIL_SETUP_INSTRUCTIONS.md"
    exit 1
fi

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "📥 Установите Node.js: https://nodejs.org/"
    exit 1
fi

# Проверяем наличие необходимых пакетов
if [ ! -d "node_modules/express" ]; then
    echo "📦 Устанавливаем необходимые пакеты..."
    npm install express cors nodemailer dotenv
fi

# Запускаем email сервер
echo "📧 Запускаем email сервер..."
node server/emailServer.js
