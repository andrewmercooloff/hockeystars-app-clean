# 🔔 Правильная сборка с поддержкой Push-уведомлений

## ⚠️ ВАЖНО: Не используйте `--non-interactive` для первой сборки после настройки push-уведомлений!

Флаг `--non-interactive` пропускает валидацию credentials, что может привести к проблемам с push-уведомлениями.

## ✅ Правильный процесс сборки

### Шаг 1: Проверка credentials (рекомендуется перед каждой сборкой)

```bash
eas credentials
```

Выберите:
- Platform: **iOS**
- Build profile: **production**

Проверьте, что все credentials настроены:
- ✅ Push Key (должен быть настроен)
- ✅ Distribution Certificate
- ✅ Provisioning Profile

### Шаг 2: Сборка БЕЗ `--non-interactive` (для валидации)

**Для первой сборки или после изменения credentials:**

```bash
eas build --platform ios --profile production
```

Это позволит EAS:
- ✅ Полностью валидировать все credentials
- ✅ Проверить, что Provisioning Profile включает Push Notifications capability
- ✅ Убедиться, что все сертификаты действительны

### Шаг 3: Последующие сборки (можно использовать `--non-interactive`)

**Только после того, как первая сборка прошла успешно:**

```bash
eas build --platform ios --profile production --non-interactive --submit
```

## 🔍 Проверка в логах сборки

При сборке БЕЗ `--non-interactive` вы должны увидеть:

```
✔ Using remote iOS credentials (Expo server)
✔ Distribution Certificate validated
✔ Provisioning Profile validated on Apple Servers
✔ Push Key validated
All credentials are ready to build
```

Если видите:
```
⚠ Distribution Certificate is not validated for non-interactive builds.
⚠ Skipping Provisioning Profile validation...
```

Это означает, что валидация пропущена, и могут быть проблемы с push-уведомлениями.

## 🔧 Если вы уже собрали с `--non-interactive`

### Вариант 1: Пересобрать без флага (рекомендуется)

```bash
# Удалите старую сборку из TestFlight (опционально)
# Затем соберите заново:
eas build --platform ios --profile production --clear-cache
```

### Вариант 2: Проверить и обновить credentials

```bash
eas credentials
```

Выберите: iOS → production → Push Notifications

Проверьте:
- Push Key активен
- Bundle Identifier совпадает: `by.hockeystars.app`
- Team ID совпадает: `FAL33J6D2V`

Затем пересоберите:
```bash
eas build --platform ios --profile production --clear-cache
```

## 📋 Чеклист перед сборкой

- [ ] Credentials проверены через `eas credentials`
- [ ] Push Key настроен и активен
- [ ] Bundle Identifier правильный: `by.hockeystars.app`
- [ ] Первая сборка после настройки push делается БЕЗ `--non-interactive`
- [ ] В логах сборки нет предупреждений о пропущенной валидации
- [ ] После успешной сборки проверены логи приложения на наличие push token

## 🎯 Рекомендуемый workflow

```bash
# 1. Проверка credentials
eas credentials

# 2. Первая сборка (с валидацией)
eas build --platform ios --profile production

# 3. После успешной сборки - можно использовать --non-interactive
eas build --platform ios --profile production --non-interactive --submit
```

## ⚠️ Когда можно использовать `--non-interactive`

Используйте `--non-interactive` только если:
- ✅ Credentials уже были проверены и валидированы
- ✅ Предыдущая сборка прошла успешно
- ✅ Вы не меняли credentials с последней сборки
- ✅ Push-уведомления работали в предыдущей сборке

## 🆘 Если push-уведомления все еще не работают

1. **Убедитесь, что собрали БЕЗ `--non-interactive`:**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

2. **Проверьте логи сборки** - не должно быть предупреждений о пропущенной валидации

3. **Проверьте App ID в Apple Developer Portal:**
   - Откройте: https://developer.apple.com/account/resources/identifiers/list
   - Найдите: `by.hockeystars.app`
   - Убедитесь, что включена capability: **Push Notifications**

4. **Проверьте Provisioning Profile:**
   - Убедитесь, что он включает Push Notifications
   - Если нет - обновите через EAS:
     ```bash
     eas credentials
     ```
     Выберите: iOS → production → Build Credentials → обновите Provisioning Profile

5. **Пересоберите приложение:**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```






