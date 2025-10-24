# Исправление ошибки импорта для push-уведомлений

## 🐛 **Проблема**
Push-уведомления для сообщений не работали из-за ошибки импорта:

```
ERROR  ❌ Ошибка отправки push-уведомления: [TypeError: getUserPushTokens is not a function (it is undefined)]
```

## 🔍 **Причина**
Функция `getUserPushTokens` импортировалась из неправильного модуля:

**Было (неправильно):**
```typescript
const { getPlayerById, getUserPushTokens } = await import('./playerStorage');
```

**Стало (правильно):**
```typescript
const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
const { getPlayerById } = await import('./playerStorage');
```

## ✅ **Исправления**

### 1. **Исправлен импорт в `playerStorage.ts`:**
```typescript
// Отправляем push-уведомление напрямую (альтернатива Realtime)
try {
  const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
  const { getPlayerById } = await import('./playerStorage');
  // ...
}
```

### 2. **Исправлен импорт в `RealtimeManager.ts`:**
```typescript
// Отправляем push уведомление
try {
  const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
  const { getPlayerById } = await import('./playerStorage');
  // ...
}
```

## 🎯 **Результат**

### Теперь функция `getUserPushTokens` импортируется из правильного модуля:
- ✅ **`notificationService.ts`** - где функция определена
- ❌ **`playerStorage.ts`** - где функция не определена

### Ожидаемые логи:
```
📨 ОТПРАВКА СООБЩЕНИЯ: {...}
📱 Push токены для получателя 3cd6dfc5-699b-4770-90cb-572edd39a9f3: 1
📱 Отправляем push о сообщении от ADMIN для пользователя 3cd6dfc5-699b-4770-90cb-572edd39a9f3
📱 PUSH: Отправляем уведомление о сообщении
📱 PUSH: Отправитель: ADMIN (1bc22582-30bf-4375-9c0b-ac6132542094)
📱 PUSH: Токенов до дедупликации: 1
📱 PUSH: Токенов после дедупликации: 1
📱 PUSH: Текст: Тест...
📱 PUSH: Успешно отправлено 1/1 уведомлений
```

## 🧪 **Тестирование**

1. **Отправьте сообщение** с Android устройства
2. **Проверьте логи** - ошибка импорта должна исчезнуть
3. **Проверьте push-уведомление** на iOS устройстве

## 🚀 **Урок**

Всегда проверяйте, что функции импортируются из правильных модулей:
- **`getUserPushTokens`** - из `notificationService.ts`
- **`getPlayerById`** - из `playerStorage.ts`
- **`sendMessageNotification`** - из `notificationService.ts`

Теперь push-уведомления для сообщений должны работать корректно! 🚀
