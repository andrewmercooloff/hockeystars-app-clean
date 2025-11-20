# Команды PowerShell для исправления worklets

## Правильные команды для PowerShell (Windows)

### 1. Удаление node_modules
```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
```

### 2. Удаление lock файлов
```powershell
Remove-Item -Force package-lock.json,yarn.lock -ErrorAction SilentlyContinue
```

### 3. Очистка npm кеша
```powershell
npm cache clean --force
```

### 4. Переустановка зависимостей
```powershell
npm install
```

### 5. Запуск с очисткой кеша
```powershell
npx expo start --clear
```

## Альтернативные команды (если нужны)

### Удаление node_modules (альтернатива)
```powershell
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
```

### Проверка установленных пакетов
```powershell
npm list react-native-worklets react-native-worklets-core
```

## Важно!

- В PowerShell используйте `Remove-Item` вместо `rm -rf`
- Команды Linux/Mac (`rm`, `rmdir`) не работают в PowerShell
- Используйте `-ErrorAction SilentlyContinue` чтобы избежать ошибок если файлы не существуют


















