# 🔔 Настройка Push-уведомлений для Production сборок

## Проблема
Push-уведомления работают в Expo Go, но не работают в TestFlight (production сборках).

## Причина
Для production сборок iOS через TestFlight требуются **production APNs credentials**, которые должны быть настроены в EAS.

## ✅ Текущий статус
- **APNs Push Key настроен**: ID `U3M77CZV7T`
- **Bundle Identifier**: `by.hockeystars.app`
- **Apple Team**: `FAL33J6D2V`
- **Credentials обновлены**: 1 month ago

## Решение

### 1. Проверка текущих credentials

Выполните команду для проверки текущих credentials:

```bash
eas credentials
```

Выберите:
- Platform: **iOS**
- Workflow: **production** (или **preview** для TestFlight)

### 2. Настройка APNs credentials

#### Вариант A: Автоматическая настройка (рекомендуется)

EAS может автоматически создать и настроить APNs ключ:

```bash
eas credentials
```

При запросе выберите:
- **Generate new APNs Key** или **Use existing APNs Key**
- Если используете существующий ключ, загрузите `.p8` файл

#### Вариант B: Ручная настройка через Apple Developer Portal

1. Откройте [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Создайте новый APNs Key:
   - Нажмите **+** (Create a key)
   - Введите название (например, "HockeyStars APNs Production")
   - Отметьте **Apple Push Notifications service (APNs)**
   - Нажмите **Continue** → **Register**
   - **Скачайте** `.p8` файл (можно скачать только один раз!)
   - Запишите **Key ID**

3. Загрузите ключ в EAS:

```bash
eas credentials
```

Выберите:
- Platform: **iOS**
- Workflow: **production**
- Credential type: **Push Notifications Key**
- Загрузите `.p8` файл
- Введите **Key ID**
- Введите **Team ID**: `FAL33J6D2V` (из вашего eas.json)

### 3. Проверка Bundle Identifier

Убедитесь, что Bundle Identifier совпадает:
- В `app.json`: `by.hockeystars.app`
- В Apple Developer Portal: `by.hockeystars.app`
- В EAS credentials: `by.hockeystars.app`

### 4. Пересборка приложения

⚠️ **ВАЖНО:** После настройки credentials пересоберите приложение **БЕЗ** флага `--non-interactive`:

```bash
# Правильно - с валидацией credentials
eas build --platform ios --profile production

# НЕПРАВИЛЬНО - пропускает валидацию
# eas build --platform ios --profile production --non-interactive
```

Флаг `--non-interactive` пропускает валидацию credentials, что может привести к проблемам с push-уведомлениями. Используйте его только для последующих сборок, когда credentials уже проверены.

Подробнее: см. `BUILD_WITH_PUSH_NOTIFICATIONS.md`

### 5. Проверка работы push-уведомлений

После установки новой сборки из TestFlight:

1. Откройте приложение
2. Проверьте логи в консоли (через Xcode или `eas build:run`)
3. Ищите сообщения с префиксом `🔔`:
   - `✅ Push token получен успешно` - токен получен
   - `✅ Push-уведомления успешно инициализированы` - все работает
   - `❌ Ошибка получения push token` - проблема с credentials

### 6. Диагностика проблем

Если push-уведомления все еще не работают:

#### Проверка 1: Credentials в EAS
```bash
eas credentials
```
Убедитесь, что для production workflow настроен APNs ключ.

#### Проверка 2: Логи приложения
Проверьте логи при запуске приложения. Должны быть сообщения:
- `🔔 Начало регистрации push-уведомлений`
- `🔔 Разрешения получены, запрашиваем токен...`
- `✅ Push token получен успешно`

Если видите ошибку с `credentials` или `E_PUSH_NOTIFICATIONS_CREDENTIALS`, значит проблема в настройке APNs.

#### Проверка 3: Разрешения на устройстве
- Настройки → HockeyStars → Уведомления → **Включено**
- Настройки → HockeyStars → Уведомления → Разрешить уведомления → **Включено**

#### Проверка 4: Токен в базе данных
Проверьте, что токен сохраняется в таблице `push_tokens`:
```sql
SELECT * FROM push_tokens WHERE user_id = 'YOUR_USER_ID' ORDER BY updated_at DESC LIMIT 1;
```

### 7. Принудительная переинициализация

Если нужно принудительно переинициализировать push-уведомления:

В коде можно использовать:
```typescript
import { initializePushNotifications, resetPushNotificationCache } from '../utils/notificationService';

// Сброс кеша
resetPushNotificationCache(userId);

// Принудительная переинициализация
await initializePushNotifications(userId, true);
```

## Важные замечания

1. **Development vs Production**: 
   - Expo Go использует development credentials (работают автоматически)
   - TestFlight требует production credentials (нужно настроить вручную)

2. **APNs Key vs Certificate**:
   - Рекомендуется использовать **APNs Key** (`.p8` файл) вместо сертификата
   - Ключ работает для всех приложений в вашей команде
   - Сертификат привязан к конкретному Bundle ID

3. **Sandbox vs Production**:
   - TestFlight использует **production** APNs
   - Убедитесь, что настроен именно production ключ

4. **Обновление credentials**:
   - Если обновили credentials, нужно пересобрать приложение
   - Старые сборки не будут работать с новыми credentials

## Дополнительные ресурсы

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [EAS Credentials Guide](https://docs.expo.dev/app-signing/managed-credentials/)
- [Apple APNs Documentation](https://developer.apple.com/documentation/usernotifications)

