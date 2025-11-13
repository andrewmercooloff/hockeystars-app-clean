# Конфигурация логов для сборки TestFlight

## Важно для диагностики

Для диагностики проблем с аудио-радаром в TestFlight **логи должны быть включены**.

## Текущая настройка

### В `eas.json`:
```json
"production": {
  "env": {
    "EXPO_PUBLIC_ENABLE_LOGS": "true"
  }
}
```

Это включает логи в production сборке через переменную окружения.

### В `utils/logSilencer.ts`:
- Логи включены, если `EXPO_PUBLIC_ENABLE_LOGS === 'true'`
- Или если в dev режиме (`__DEV__ === true`)

### В `app/_layout.tsx`:
- Логи отключаются только если: production И `EXPO_PUBLIC_ENABLE_LOGS !== 'true'`

## Как это работает

1. **Development build**: Логи всегда включены (`__DEV__ === true`)

2. **Production build (TestFlight)**:
   - Если `EXPO_PUBLIC_ENABLE_LOGS: "true"` → логи включены ✅
   - Если `EXPO_PUBLIC_ENABLE_LOGS` не установлена → логи отключены ❌

## Для диагностики проблем

### Включить логи в production:
```json
// eas.json
"production": {
  "env": {
    "EXPO_PUBLIC_ENABLE_LOGS": "true"
  }
}
```

### Отключить логи (после исправления проблем):
```json
// eas.json
"production": {
  "env": {
    // Убрать или установить в "false"
    // "EXPO_PUBLIC_ENABLE_LOGS": "false"
  }
}
```

Или изменить в `utils/logSilencer.ts`:
```typescript
const silentNonError = !isDev; // Отключать логи в production
```

## Просмотр логов в TestFlight

### Через Xcode:
1. Подключи iPhone к Mac
2. Открой Xcode → Window → Devices and Simulators
3. Выбери устройство
4. Нажми "Open Console"
5. Фильтруй по имени приложения

### Через TestFlight:
- Логи доступны через системные логи iOS
- Используй инструменты разработчика Apple

### Через код:
- Все `console.log()` будут видны, если логи включены
- Используй префиксы для фильтрации: `[AUDIO]`, `[iOS]`, `[Expo AV]`

## Рекомендации

### Для текущей сборки (диагностика):
✅ **Включить логи** через `EXPO_PUBLIC_ENABLE_LOGS: "true"`

### После исправления проблем:
⚠️ **Отключить логи** для оптимизации production сборки

## Важные логи для диагностики аудио-радара

Ищи в логах:
- `[iOS] Callback #X` - вызывается ли callback
- `[iOS] Expo AV метринг #X` - работает ли expo-av fallback
- `[iOS] КРИТИЧНО: Callback не вызывается!` - проблема с AudioRecorderPlayer
- `[iOS] Переключаемся на expo-av` - автоматический fallback

## Текущий статус

✅ Логи включены в production через `EXPO_PUBLIC_ENABLE_LOGS: "true"`
✅ Это позволит диагностировать проблему с аудио-радаром в TestFlight



