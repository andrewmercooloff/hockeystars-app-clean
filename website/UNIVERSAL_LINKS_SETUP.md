# Настройка Universal Links и App Links

## 🎯 Цель

Настроить прямые ссылки, чтобы QR-код **напрямую** открывал приложение без промежуточной веб-страницы.

## 📋 Что нужно сделать

### 1. Настроить Universal Links для iOS

**Файл:** `.well-known/apple-app-site-association`

1. Замените `TEAM_ID` на ваш реальный Team ID из Apple Developer
   - Найти можно в Apple Developer Portal → Membership
   - Формат: `ABC123DEF4` (10 символов)

2. Убедитесь, что bundle identifier правильный: `by.hockeystars.app`

3. Загрузите файл на сервер в папку `.well-known/` в корне сайта

4. **Важно:** Файл должен быть доступен по HTTPS без редиректов
   - URL: `https://hockey-stars.com/.well-known/apple-app-site-association`
   - Content-Type: `application/json` (не `text/html`!)

### 2. Настроить App Links для Android

**Файл:** `.well-known/assetlinks.json`

1. Получите SHA-256 fingerprint вашего приложения:
   ```bash
   # Для release keystore
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   
   # Или для debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

2. Замените `YOUR_SHA256_FINGERPRINT_HERE` на реальный fingerprint

3. Загрузите файл на сервер в папку `.well-known/` в корне сайта

4. **Важно:** Файл должен быть доступен по HTTPS
   - URL: `https://hockey-stars.com/.well-known/assetlinks.json`
   - Content-Type: `application/json`

### 3. Настроить сервер

#### Для Apache (.htaccess):

Добавьте в `.htaccess`:

```apache
# Правильный Content-Type для Universal Links
<FilesMatch "apple-app-site-association">
    Header set Content-Type "application/json"
</FilesMatch>

<FilesMatch "assetlinks.json">
    Header set Content-Type "application/json"
</FilesMatch>
```

#### Для Nginx:

Добавьте в конфигурацию:

```nginx
location /.well-known/apple-app-site-association {
    default_type application/json;
    add_header Content-Type application/json;
}

location /.well-known/assetlinks.json {
    default_type application/json;
    add_header Content-Type application/json;
}
```

### 4. Настроить приложение

#### iOS (app.json или app.config.js):

Убедитесь, что в конфигурации Expo/React Native указаны:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:hockey-stars.com"]
    }
  }
}
```

#### Android (app.json или app.config.js):

Убедитесь, что в конфигурации указаны:

```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "hockey-stars.com",
              "pathPrefix": "/player"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## ✅ Проверка

### iOS:

1. Откройте в Safari на iPhone: `https://hockey-stars.com/.well-known/apple-app-site-association`
   - Должен открыться JSON файл (не HTML страница!)

2. Проверьте Universal Links:
   - Откройте в Safari: `https://hockey-stars.com/player/test-id`
   - Если приложение установлено - должно открыться напрямую
   - Если не установлено - откроется веб-страница

### Android:

1. Проверьте App Links:
   ```bash
   adb shell pm get-app-links by.hockeystars.app
   ```

2. Или откройте в браузере: `https://hockey-stars.com/player/test-id`
   - Если приложение установлено - должно открыться напрямую

## 🔄 Как это работает

1. **Пользователь сканирует QR-код** → открывается `https://hockey-stars.com/player/{id}`

2. **iOS/Android проверяют** файлы `.well-known/apple-app-site-association` и `.well-known/assetlinks.json`

3. **Если приложение установлено:**
   - Система **напрямую** открывает приложение
   - Веб-страница **не показывается**

4. **Если приложение не установлено:**
   - Открывается веб-страница `player.php`
   - Она пытается открыть приложение через custom scheme
   - Если не получается - редирект на App Store/Google Play

## 📝 Примечания

- Universal Links работают только по HTTPS
- Файлы должны быть доступны без редиректов
- После изменения файлов может потребоваться время для обновления кеша (до 24 часов)
- Для тестирования можно очистить кеш iOS: Settings → Safari → Clear History and Website Data

