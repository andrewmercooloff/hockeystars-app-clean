@echo off
REM Скрипт для исправления проблем с react-native-worklets (Windows)
REM Использование: fix-worklets.bat

echo 🧹 Очистка node_modules и кеша...

REM Удаляем node_modules
if exist node_modules rmdir /s /q node_modules

REM Удаляем lock файлы
if exist package-lock.json del /f package-lock.json
if exist yarn.lock del /f yarn.lock

REM Очищаем npm кеш
call npm cache clean --force

echo 📦 Переустановка зависимостей...
call npm install

echo 🔄 Очистка кеша Metro и Expo...
echo Запустите вручную: npx expo start --clear

echo ✅ Готово! Перезапустите приложение.

pause










