# Проверка статуса сборки EAS

## Команды для проверки статуса

### 1. Посмотреть последние сборки:

```powershell
# Все платформы
eas build:list

# Только iOS
eas build:list --platform ios

# Только Android
eas build:list --platform android

# Последние 5 сборок
eas build:list --limit 5
```

### 2. Посмотреть конкретную сборку:

Если у вас есть ID сборки (из логов):
```powershell
eas build:view [BUILD_ID]
```

Например:
```powershell
eas build:view bf1336a7-5d2a-4345-b7c3-ba188b08bfef
```

### 3. Посмотреть логи сборки:

```powershell
# Последняя сборка
eas build:view

# Конкретная сборка
eas build:view [BUILD_ID] --logs
```

### 4. Открыть в браузере:

Из логов видно ссылку:
```
See logs: https://expo.dev/accounts/mercooloff/projects/hockeystars/builds/bf1336a7-5d2a-4345-b7c3-ba188b08bfef
```

Откройте эту ссылку в браузере для просмотра статуса и логов.

### 5. Продолжить мониторинг сборки:

```powershell
# Если сборка еще идет, можно продолжить мониторинг
eas build:view [BUILD_ID] --wait
```

## Статусы сборки:

- `in_progress` - сборка идет
- `finished` - сборка завершена успешно
- `errored` - сборка завершилась с ошибкой
- `canceled` - сборка отменена

## Если сборка завершилась с ошибкой:

1. Посмотрите логи:
   ```powershell
   eas build:view [BUILD_ID] --logs
   ```

2. Проверьте ошибку в браузере по ссылке из логов

3. Исправьте ошибку и запустите сборку заново:
   ```powershell
   eas build --platform ios --profile development
   ```


















