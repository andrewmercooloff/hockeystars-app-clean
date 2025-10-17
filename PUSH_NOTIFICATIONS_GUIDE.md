# 📱 Push-уведомления в HockeyStars

## 🚀 Что настроено

### ✅ Готово:
1. **Expo Notifications** - установлен и настроен
2. **Push token регистрация** - автоматически при входе пользователя
3. **База данных** - таблица `push_tokens` для хранения токенов
4. **API endpoints** - для тестирования и отправки уведомлений
5. **Скрытие нижней панели** - настройки в `app.json`

## 🔧 Настройка базы данных

Выполните SQL скрипт для создания таблицы push tokens:

```sql
-- Запустите этот скрипт в вашей базе данных
\i database/setup_push_tokens_table.sql
```

## 📱 Как работают push-уведомления

### Автоматическая регистрация:
1. При входе пользователя в приложение
2. Получается Expo push token
3. Сохраняется в базе данных
4. Готов к получению уведомлений

### Отправка уведомлений:
1. Через API endpoint `/api/push-notifications/test/:userId`
2. Через функцию `sendNotificationToUser()` в коде
3. Через broadcast всем пользователям

## 🧪 Тестирование

### 1. Тестовое уведомление пользователю:
```bash
curl -X POST http://localhost:3000/api/push-notifications/test/USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Тестовое уведомление",
    "body": "Это тестовое push-уведомление!"
  }'
```

### 2. Проверка токенов пользователя:
```bash
curl http://localhost:3000/api/push-notifications/tokens/USER_ID
```

### 3. Broadcast всем пользователям:
```bash
curl -X POST http://localhost:3000/api/push-notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Важное объявление",
    "body": "Новое обновление приложения доступно!"
  }'
```

## 📋 Требования для работы

### В APK:
- ✅ **Физическое устройство** (не эмулятор)
- ✅ **Интернет соединение**
- ✅ **Разрешения на уведомления** (запрашиваются автоматически)
- ✅ **Expo push token** (получается автоматически)

### На сервере:
- ✅ **Expo Push API** (бесплатный)
- ✅ **База данных** с таблицей `push_tokens`
- ✅ **Интернет соединение**

## 🎯 Интеграция в код

### Отправка уведомления пользователю:
```typescript
import { sendNotificationToUser } from '../utils/notificationService';

// Отправить уведомление
await sendNotificationToUser(
  userId, 
  'Новое сообщение', 
  'У вас новое сообщение от друга!',
  { type: 'message', chatId: '123' }
);
```

### Отправка уведомления всем устройствам пользователя:
```typescript
import { getUserPushTokens, sendPushNotification } from '../utils/notificationService';

const tokens = await getUserPushTokens(userId);
for (const token of tokens) {
  await sendPushNotification(token, 'Заголовок', 'Текст уведомления');
}
```

## 🔍 Отладка

### Проверка логов:
```bash
# В приложении
console.log('✅ Push token получен:', token);

# На сервере
console.log('✅ Push-уведомление отправлено');
```

### Проверка токенов в базе:
```sql
SELECT * FROM push_tokens WHERE user_id = 'USER_ID';
```

## ⚠️ Важные моменты

1. **Push-уведомления работают только на физических устройствах**
2. **Требуется интернет соединение**
3. **Пользователь должен разрешить уведомления**
4. **Expo Push API имеет лимиты** (бесплатно до 1000 уведомлений/день)
5. **Токены могут изменяться** при переустановке приложения

## 🚀 Готово к использованию!

Push-уведомления полностью настроены и готовы к работе в APK. При первом запуске приложения пользователь получит запрос на разрешение уведомлений, и после этого сможет получать push-уведомления даже когда приложение закрыто.











