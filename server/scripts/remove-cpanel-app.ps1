# PowerShell скрипт для удаления заблокированного Node.js приложения в cPanel через SSH
# Использование: .\server\scripts\remove-cpanel-app.ps1

Write-Host "🔧 Скрипт удаления Node.js приложения из cPanel" -ForegroundColor Cyan
Write-Host ""

# Параметры подключения (замените на свои)
$HOST = "hockey-stars.com"
$USER = "ваш_пользователь"  # Замените на ваш cPanel username
$DOMAIN = "hockey-stars.com"
$APP_ROOT = "api"

Write-Host "📋 Параметры:" -ForegroundColor Yellow
Write-Host "   Host: $HOST"
Write-Host "   User: $USER"
Write-Host "   Domain: $DOMAIN"
Write-Host "   App Root: $APP_ROOT"
Write-Host ""

$confirm = Read-Host "Продолжить? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Отменено." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔌 Подключаемся к серверу..." -ForegroundColor Cyan
Write-Host ""

# Команды для выполнения на удаленном сервере
$commands = @"
echo "📁 Текущая директория:"
pwd

echo ""
echo "🔍 Ищем процессы Node.js..."
ps aux | grep node | grep -v grep || echo "Процессы Node.js не найдены"

echo ""
echo "🛑 Останавливаем все процессы Node.js для текущего пользователя..."
pkill -u \$(whoami) node 2>/dev/null || echo "Процессы уже остановлены"

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
    if [ -d "\$dir/api" ]; then
        echo "Найдена папка: \$dir/api"
        echo "Переименовываем в api_old_backup..."
        mv "\$dir/api" "\$dir/api_old_backup" 2>/dev/null && echo "✅ Переименовано" || echo "⚠️  Не удалось переименовать"
    fi
done

echo ""
echo "🧹 Очищаем кеш процессов..."
sleep 2

echo ""
echo "✅ Готово! Теперь попробуйте удалить приложение через cPanel интерфейс."
"@

# Выполняем команды через SSH
ssh "${USER}@${HOST}" $commands

Write-Host ""
Write-Host "🎉 Скрипт выполнен!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Следующие шаги:" -ForegroundColor Yellow
Write-Host "   1. Откройте Node.js менеджер в cPanel"
Write-Host "   2. Попробуйте удалить старое приложение"
Write-Host "   3. Если не получается, подождите 2-3 минуты и попробуйте снова"
Write-Host "   4. Создайте новое приложение с параметрами:"
Write-Host "      - Application Root: api/"
Write-Host "      - Application URL: /app"
Write-Host "      - Application Startup File: app.js"










