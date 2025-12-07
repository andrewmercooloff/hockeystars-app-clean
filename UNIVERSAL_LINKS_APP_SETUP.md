# Настройка Universal Links в приложении

## ✅ Что было сделано

### 1. Обновлен `app.json`
- Добавлен `associatedDomains` для iOS: `["applinks:hockey-stars.com"]`
- Добавлены `intentFilters` для Android с поддержкой `https://hockey-stars.com/player/*`

### 2. Обновлен `app/_layout.tsx`
- Добавлена обработка входящих URL через `Linking` API
- Обрабатываются:
  - Universal Links: `https://hockey-stars.com/player/{id}`
  - Custom scheme: `hockeystars://player/{id}`

## 📱 Что нужно сделать

### 1. Пересобрать приложение

После изменений в `app.json` нужно пересобрать приложение:

```bash
# Для iOS
eas build --platform ios --profile production

# Для Android
eas build --platform android --profile production
```

**Важно:** Universal Links работают только в production сборках, не в Expo Go!

### 2. Загрузить файлы на сервер

Убедитесь, что на сервере `hockey-stars.com` загружены:
- `.well-known/apple-app-site-association` (с Team ID: `FAL33J6D2V`)
- `.well-known/assetlinks.json` (с SHA-256 fingerprint)
- Обновленный `.htaccess` (с правильным Content-Type)

### 3. Проверить работу

После пересборки и загрузки файлов:

1. **Установите новую сборку** на устройство
2. **Откройте в Safari/Chrome:** `https://hockey-stars.com/player/test-id`
3. **Если приложение установлено** - должно открыться напрямую в приложении
4. **Если не установлено** - откроется веб-страница с редиректом на магазин

## 🔄 Как это работает

1. **Пользователь сканирует QR-код** → открывается `https://hockey-stars.com/player/{id}`

2. **iOS/Android проверяют:**
   - Файл `.well-known/apple-app-site-association` (iOS)
   - Файл `.well-known/assetlinks.json` (Android)
   - Настройки в приложении (`associatedDomains` / `intentFilters`)

3. **Если все настроено правильно:**
   - Система открывает приложение напрямую
   - Приложение получает URL через `Linking` API
   - `_layout.tsx` обрабатывает URL и перенаправляет на `/player/{id}`

4. **Если приложение не установлено:**
   - Открывается веб-страница `player.php`
   - Редирект на App Store/Google Play

## ⚠️ Важно

- Universal Links работают только в **production сборках**
- Не работают в Expo Go или development сборках
- После изменения файлов на сервере может потребоваться время для обновления кеша (до 24 часов)
- Для тестирования можно очистить кеш iOS: Settings → Safari → Clear History and Website Data

## 🧪 Тестирование

### iOS:
1. Установите production сборку из TestFlight
2. Откройте в Safari: `https://hockey-stars.com/player/test-id`
3. Должно открыться приложение на экране профиля

### Android:
1. Установите production сборку (APK или из Google Play)
2. Откройте в браузере: `https://hockey-stars.com/player/test-id`
3. Должно открыться приложение на экране профиля

