@echo off
echo 🚀 Запуск локальной среды HockeyStars на Windows...

REM Проверка наличия MongoDB
where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ MongoDB не установлен!
    echo 📥 Установите MongoDB: https://docs.mongodb.com/manual/installation/
    pause
    exit /b 1
)

REM Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo 📥 Установите Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Проверка зависимостей завершена

REM Создание папки для данных MongoDB
if not exist "data\db" mkdir "data\db"

REM Запуск MongoDB (если не запущен)
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%errorlevel%" neq "0" (
    echo 🔄 Запуск MongoDB...
    start /B mongod --dbpath ./data/db
    timeout /t 3 /nobreak >nul
)

REM Установка зависимостей сервера
echo 📦 Установка зависимостей сервера...
cd server
if not exist "node_modules" (
    npm install
)

REM Создание .env файла если не существует
if not exist ".env" (
    echo 📝 Создание .env файла...
    copy env.example .env
    echo ⚠️  Отредактируйте .env файл в папке server/
)

REM Запуск сервера
echo 🌐 Запуск API сервера...
start /B npm run dev

cd ..

REM Установка зависимостей клиента
echo 📱 Установка зависимостей клиента...
if not exist "node_modules" (
    npm install
)

REM Создание .env файла для клиента если не существует
if not exist ".env" (
    echo 📝 Создание .env файла для клиента...
    (
        echo EXPO_PUBLIC_API_URL=http://localhost:5000/api
        echo EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
    ) > .env
)

REM Запуск клиента
echo 📱 Запуск клиентского приложения...
npm start

echo 🛑 Нажмите любую клавишу для остановки...
pause >nul

REM Остановка процессов
taskkill /F /IM node.exe >nul 2>nul
taskkill /F /IM mongod.exe >nul 2>nul 