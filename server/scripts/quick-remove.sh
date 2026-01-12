#!/bin/bash
# Быстрое удаление Node.js приложения через SSH

# ЗАМЕНИТЕ 'ваш_username' на ваш реальный cPanel username
USERNAME="ваш_username"
HOST="hockey-stars.com"

echo "🔧 Удаление Node.js приложения..."
echo "📡 Подключение: $USERNAME@$HOST"
echo ""

ssh $USERNAME@$HOST << 'EOF'
echo "🛑 Останавливаем процессы Node.js..."
pkill -u $(whoami) node 2>/dev/null || echo "Процессы уже остановлены"

echo "📁 Ищем папки приложений..."
if [ -d ~/nodevenv ]; then
    echo "Найдена папка nodevenv"
    ls -la ~/nodevenv/ | head -10
    
    # Удаляем приложения для hockey-stars.com
    if [ -d ~/nodevenv/hockey-stars.com ]; then
        echo "🗑️  Удаляем приложения для hockey-stars.com..."
        rm -rf ~/nodevenv/hockey-stars.com
        echo "✅ Удалено"
    fi
fi

echo "📁 Переименовываем папку api/..."
for dir in ~/public_html ~/domains/hockey-stars.com/public_html; do
    if [ -d "$dir/api" ]; then
        mv "$dir/api" "$dir/api_old_backup" 2>/dev/null && echo "✅ Переименовано: $dir/api"
    fi
done

echo ""
echo "✅ Готово! Теперь удалите приложение через cPanel интерфейс."
EOF

echo ""
echo "🎉 Команды выполнены!"










