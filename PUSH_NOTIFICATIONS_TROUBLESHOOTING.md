# 🔍 Диагностика проблем с Push-уведомлениями в TestFlight

## ⚠️ ВАЖНО: Проблема с `--non-interactive` флагом

Если вы использовали `--non-interactive` при сборке, это может быть причиной проблемы!

**Проблема:**
- Флаг `--non-interactive` пропускает валидацию credentials
- Provisioning Profile может не включать правильные capabilities для push-уведомлений
- Distribution Certificate может быть не полностью валидирован

**Решение:**
1. **Сделайте сборку БЕЗ `--non-interactive` хотя бы один раз:**
   ```bash
   eas build --platform ios --profile production
   ```
   Это позволит EAS полностью валидировать все credentials.

2. **Или явно проверьте credentials перед сборкой:**
   ```bash
   eas credentials
   ```
   Выберите: iOS → production → проверьте все credentials

3. **Убедитесь, что Provisioning Profile включает Push Notifications:**
   - В Apple Developer Portal проверьте, что ваш App ID имеет включенную capability "Push Notifications"
   - Provisioning Profile должен быть создан с этой capability

Подробнее: см. `BUILD_WITH_PUSH_NOTIFICATIONS.md`

## ✅ Проверка 1: Credentials настроены

Ваши credentials уже настроены:
- ✅ Push Key ID: `U3M77CZV7T`
- ✅ Bundle Identifier: `by.hockeystars.app`
- ✅ Apple Team: `FAL33J6D2V`

## 🔍 Проверка 2: Логи приложения

После установки новой сборки из TestFlight, проверьте логи:

### Что должно быть в логах:

```
🔔 Начало регистрации push-уведомлений
🔔 Platform.OS: ios
🔔 Device.isDevice: true
🔔 Текущий статус разрешений: granted
🔔 Разрешения получены, запрашиваем токен...
🔔 Используемый projectId: ccb608ca-e849-4a98-b337-d38863d3ebff
✅ Push token получен успешно: ExponentPushToken[...]
🔔 Длина токена: 41
🔔 Сохранение push token для пользователя: [USER_ID]
✅ Push token создан
✅ Push-уведомления успешно инициализированы для пользователя: [USER_ID]
```

### Если видите ошибки:

#### Ошибка: `E_PUSH_NOTIFICATIONS_CREDENTIALS` или `credentials`
```
❌ Ошибка получения push token: [error]
⚠️ ВНИМАНИЕ: Проблема с credentials для push-уведомлений!
```

**Решение:**
1. Проверьте, что Push Key активен в EAS:
   ```bash
   eas credentials
   ```
   Выберите: iOS → production → Push Notifications

2. Убедитесь, что используется production ключ (не development)

#### Ошибка: `permission denied`
```
❌ Push notifications permission denied. Status: denied
```

**Решение:**
1. Настройки iPhone → HockeyStars → Уведомления → **Включить**
2. Перезапустите приложение

#### Ошибка: `RLS policy` или `permission` при сохранении токена
```
❌ Ошибка вставки push token: [error]
⚠️ ВНИМАНИЕ: Проблема с RLS политиками!
```

**Решение:**
Проверьте RLS политики для таблицы `push_tokens`:
```sql
-- Проверка политик
SELECT * FROM pg_policies WHERE tablename = 'push_tokens';

-- Должны быть политики:
-- - Allow read own push tokens (SELECT)
-- - Allow insert push tokens (INSERT)
-- - Allow update push tokens (UPDATE)
```

## 🔍 Проверка 3: Токен в базе данных

Проверьте, что токен сохраняется:

```sql
-- Последние токены пользователя
SELECT 
  id, 
  user_id, 
  token, 
  platform, 
  device_id,
  created_at, 
  updated_at 
FROM push_tokens 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY updated_at DESC 
LIMIT 5;
```

**Что проверить:**
- ✅ Токен начинается с `ExponentPushToken[`
- ✅ `platform` = `ios`
- ✅ `updated_at` - недавняя дата (после установки новой сборки)

## 🔍 Проверка 4: Отправка тестового уведомления

### Через код (в приложении):

```typescript
import { sendNotificationToUser } from '../utils/notificationService';

// Отправка тестового уведомления
await sendNotificationToUser(
  'YOUR_USER_ID',
  'Тест',
  'Это тестовое уведомление'
);
```

### Через сервер (если есть endpoint):

```bash
curl -X POST https://your-server.com/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID", "title": "Тест", "body": "Тестовое уведомление"}'
```

### Через Expo Push Notification Tool:

1. Откройте: https://expo.dev/notifications
2. Введите токен из базы данных
3. Отправьте тестовое уведомление

## 🔍 Проверка 5: Разрешения на устройстве

### iOS Settings:
1. Настройки → HockeyStars → Уведомления
   - ✅ Разрешить уведомления: **ВКЛ**
   - ✅ Звуки: **ВКЛ**
   - ✅ Значки: **ВКЛ**
   - ✅ Баннеры: **ВКЛ**

2. Настройки → Уведомления → HockeyStars
   - ✅ Разрешить уведомления: **ВКЛ**

## 🔍 Проверка 6: Переинициализация

Если токен не обновляется, принудительно переинициализируйте:

```typescript
import { 
  initializePushNotifications, 
  resetPushNotificationCache 
} from '../utils/notificationService';

// Сброс кеша
resetPushNotificationCache('YOUR_USER_ID');

// Принудительная переинициализация
await initializePushNotifications('YOUR_USER_ID', true);
```

## 🔍 Проверка 7: Версия сборки

Убедитесь, что используете **новую сборку** после настройки credentials:

1. Проверьте build number в TestFlight
2. Убедитесь, что установлена последняя версия
3. Если нужно, удалите старую версию и установите заново

## 📋 Чеклист для диагностики

- [ ] APNs credentials настроены в EAS
- [ ] Используется production сборка (не development)
- [ ] Разрешения на уведомления включены на устройстве
- [ ] Токен сохраняется в базе данных
- [ ] Токен начинается с `ExponentPushToken[`
- [ ] `platform` = `ios` в базе данных
- [ ] Логи показывают успешное получение токена
- [ ] Нет ошибок RLS при сохранении токена
- [ ] Тестовое уведомление отправляется успешно

## 🆘 Если ничего не помогает

1. **Проверьте логи EAS Build:**
   - Откройте: https://expo.dev/accounts/mercooloff/projects/hockeystars/builds
   - Найдите последнюю сборку
   - Проверьте логи на наличие ошибок

2. **Проверьте App Store Connect:**
   - Убедитесь, что сборка обработана Apple
   - Проверьте, нет ли проблем с сертификатами

3. **Создайте новую сборку:**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

4. **Проверьте projectId:**
   - Убедитесь, что в `app.json` указан правильный `projectId`
   - Проверьте, что он совпадает с EAS project ID

## 📞 Полезные ссылки

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [EAS Credentials](https://docs.expo.dev/app-signing/managed-credentials/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Apple APNs Documentation](https://developer.apple.com/documentation/usernotifications)

