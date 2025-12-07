# 📋 Где взять данные для Universal Links

## ✅ Уже найдено в вашем проекте

### 1. iOS Team ID
**Значение:** `FAL33J6D2V`

**Где найдено:**
- Файл `eas.json` → `submit.production.ios.appleTeamId`
- Файл `PUSH_NOTIFICATIONS_SETUP.md`

**Уже обновлено в:** `.well-known/apple-app-site-association`

### 2. Bundle Identifier
**Значение:** `by.hockeystars.app`

**Где найдено:**
- Файл `app.json`
- Используется везде в проекте

---

## 🔍 Как получить SHA-256 fingerprint для Android

### Вариант 1: Из debug keystore (для тестирования)

У вас есть файл: `android/app/debug.keystore`

Выполните команду в терминале:

```bash
# Windows (PowerShell)
keytool -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# Mac/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Что искать:**
В выводе найдите строку:
```
SHA256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

**Скопируйте значение** (без пробелов, только двоеточия):
```
XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### Вариант 2: Из release keystore (для production)

Если у вас есть production keystore файл:

```bash
keytool -list -v -keystore путь/к/вашему/release.keystore -alias ваш-алиас
```

Вам нужно будет ввести пароль keystore.

### Вариант 3: Из установленного приложения (если уже опубликовано)

Если приложение уже установлено на устройстве:

```bash
# Подключите Android устройство через USB
# Включите отладку по USB в настройках разработчика

# Затем выполните:
adb shell pm list packages | grep hockeystars
adb shell dumpsys package by.hockeystars.app | grep -A 1 "signatures"
```

### Вариант 4: Из Google Play Console (если приложение опубликовано)

1. Откройте [Google Play Console](https://play.google.com/console)
2. Выберите ваше приложение
3. Перейдите в **Release** → **Setup** → **App signing**
4. Найдите **SHA-256 certificate fingerprint**

---

## 📝 Что делать дальше

### Шаг 1: Получите SHA-256 fingerprint

Используйте один из вариантов выше, чтобы получить fingerprint.

### Шаг 2: Обновите файл `assetlinks.json`

Откройте файл: `website/.well-known/assetlinks.json`

Замените `YOUR_SHA256_FINGERPRINT_HERE` на ваш реальный fingerprint:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "by.hockeystars.app",
    "sha256_cert_fingerprints": [
      "ВАШ_FINGERPRINT_ЗДЕСЬ"
    ]
  }
}]
```

**Важно:** 
- Используйте формат с двоеточиями: `XX:XX:XX:XX:...`
- Можно указать несколько fingerprint'ов (для debug и release)

### Шаг 3: Загрузите файлы на сервер

Загрузите на `hockey-stars.com`:
1. Папку `.well-known/` с обоими файлами:
   - `apple-app-site-association` (уже обновлен с Team ID)
   - `assetlinks.json` (нужно обновить с fingerprint)

2. Убедитесь, что файлы доступны по HTTPS:
   - `https://hockey-stars.com/.well-known/apple-app-site-association`
   - `https://hockey-stars.com/.well-known/assetlinks.json`

### Шаг 4: Проверьте Content-Type

Убедитесь, что сервер отдает файлы с правильным Content-Type:
- `application/json` (не `text/html`!)

Это уже настроено в `.htaccess`, но проверьте после загрузки.

---

## 🧪 Проверка

### iOS:
Откройте в Safari на iPhone:
```
https://hockey-stars.com/.well-known/apple-app-site-association
```

Должен открыться JSON файл (не HTML страница!).

### Android:
Откройте в браузере:
```
https://hockey-stars.com/.well-known/assetlinks.json
```

Должен открыться JSON файл с вашим fingerprint.

---

## ⚠️ Важные замечания

1. **Для debug keystore:**
   - Fingerprint будет работать только для debug сборок
   - Для production нужен fingerprint из release keystore

2. **Для production:**
   - Используйте fingerprint из Google Play Console или из release keystore
   - Можно указать оба fingerprint'а в массиве

3. **После изменения:**
   - Может потребоваться время для обновления кеша (до 24 часов)
   - Для тестирования очистите кеш браузера

