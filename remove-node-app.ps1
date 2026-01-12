# PowerShell скрипт для удаления Node.js приложения через SSH
# Использование: .\remove-node-app.ps1

Write-Host "🔧 Удаление Node.js приложения из cPanel" -ForegroundColor Cyan
Write-Host ""

# Запрашиваем username
$username = Read-Host "Введите ваш cPanel username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username не может быть пустым!" -ForegroundColor Red
    exit 1
}

$hostname = "hockey-stars.com"

Write-Host ""
Write-Host "📡 Подключение: $username@$hostname" -ForegroundColor Yellow
Write-Host ""

# Команды для выполнения на сервере (одной строкой)
$command = "pkill -u `$(whoami) node 2>/dev/null; rm -rf ~/nodevenv/hockey-stars.com 2>/dev/null; if [ -d ~/public_html/api ]; then mv ~/public_html/api ~/public_html/api_old_backup; echo 'Переименовано api/'; elif [ -d ~/domains/hockey-stars.com/public_html/api ]; then mv ~/domains/hockey-stars.com/public_html/api ~/domains/hockey-stars.com/public_html/api_old_backup; echo 'Переименовано api/'; fi; echo 'Готово!'"

# Выполняем команды через SSH
try {
    Write-Host "Выполняю команды на сервере..." -ForegroundColor Yellow
    ssh "${username}@${hostname}" $command
    
    Write-Host ""
    Write-Host "🎉 Команды выполнены!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Следующие шаги:" -ForegroundColor Yellow
    Write-Host "   1. Откройте cPanel → Node.js менеджер"
    Write-Host "   2. Попробуйте удалить старое приложение"
    Write-Host "   3. Если не получается, подождите 2-3 минуты"
    Write-Host "   4. Создайте новое приложение:"
    Write-Host "      - Application Root: api/"
    Write-Host "      - Application URL: /app"
    Write-Host "      - Application Startup File: app.js"
} catch {
    Write-Host ""
    Write-Host "❌ Ошибка при выполнении команд:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "💡 Попробуйте выполнить команды вручную:" -ForegroundColor Yellow
    Write-Host "   ssh $username@$hostname"
    Write-Host "   Затем выполните команды из файла REMOVE_NODE_APP.txt"
}

