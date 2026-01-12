#!/bin/bash

# Скрипт для удаления заблокированного Node.js приложения в cPanel через SSH
# Использование: bash server/scripts/remove-cpanel-app.sh

echo "🔧 Скрипт удаления Node.js приложения из cPanel"
echo ""

# Параметры подключения (замените на свои)
HOST="hockey-stars.com"
USER="ваш_пользователь"  # Замените на ваш cPanel username
DOMAIN="hockey-stars.com"
APP_ROOT="api"

echo "📋 Параметры:"
echo "   Host: $HOST"
echo "   User: $USER"
echo "   Domain: $DOMAIN"
echo "   App Root: $APP_ROOT"
echo ""

read -p "Продолжить? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 1
fi

echo ""
echo "🔌 Подключаемся к серверу..."
echo ""

# Выполняем команды на удаленном сервере
ssh $USER@$HOST << 'ENDSSH'

echo "📁 Текущая директория:"
pwd

echo ""
echo "🔍 Ищем процессы Node.js..."
ps aux | grep node | grep -v grep || echo "Процессы Node.js не найдены"

echo ""
echo "🛑 Останавливаем все процессы Node.js для текущего пользователя..."
pkill -u $(whoami) node 2>/dev/null || echo "Процессы уже остановлены"

echo ""
echo "📁 Ищем папки Node.js приложений..."
if [ -d ~/nodevenv ]; then
    echo "Найдена папка ~/nodevenv:"
    ls -la ~/nodevenv/ 2>/dev/null || echo "Папка пуста или недоступна"
    
    # Ищем приложения для домена
    if [ -d ~/nodevenv/$DOMAIN ]; then
        echo ""
        echo "📁 Найдены приложения для домена $DOMAIN:"
        find ~/nodevenv/$DOMAIN -type d -maxdepth 3 2>/dev/null | head -20
        
        echo ""
        echo "🗑️  Удаляем приложения для домена $DOMAIN..."
        rm -rf ~/nodevenv/$DOMAIN 2>/dev/null && echo "✅ Удалено ~/nodevenv/$DOMAIN" || echo "⚠️  Не удалось удалить ~/nodevenv/$DOMAIN"
    fi
else
    echo "⚠️  Папка ~/nodevenv не найдена"
fi

echo ""
echo "📁 Ищем папку api/ в корне домена..."
# Проверяем разные возможные расположения
for dir in ~/public_html ~/domains/$DOMAIN/public_html ~/$DOMAIN/public_html; do
    if [ -d "$dir/api" ]; then
        echo "Найдена папка: $dir/api"
        echo "Переименовываем в api_old_backup..."
        mv "$dir/api" "$dir/api_old_backup" 2>/dev/null && echo "✅ Переименовано" || echo "⚠️  Не удалось переименовать"
    fi
done

echo ""
echo "🧹 Очищаем кеш процессов..."
sleep 2

echo ""
echo "✅ Готово! Теперь попробуйте удалить приложение через cPanel интерфейс."

ENDSSH

echo ""
echo "🎉 Скрипт выполнен!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Откройте Node.js менеджер в cPanel"
echo "   2. Попробуйте удалить старое приложение"
echo "   3. Если не получается, подождите 2-3 минуты и попробуйте снова"
echo "   4. Создайте новое приложение с параметрами:"
echo "      - Application Root: api/"
echo "      - Application URL: /app"
echo "      - Application Startup File: app.js"










