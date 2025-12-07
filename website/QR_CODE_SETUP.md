# Настройка QR-кодов для редиректа в App Store/Google Play

## ✅ Что было сделано

1. **Обновлены QR-коды в приложении** - теперь они используют HTTPS URL вместо custom scheme:
   - Было: `hockeystars://player/{id}`
   - Стало: `https://hockey-stars.com/player/{id}`

2. **Создана веб-страница** `player.php` для обработки редиректов:
   - Определяет платформу (iOS/Android)
   - Пытается открыть приложение через deep link
   - Если приложение не установлено - редиректит на App Store/Google Play

## 🔧 Настройка сервера

### ✅ Готово для PHP сервера (hockey-stars.com)

Созданы файлы:
- **`player.php`** - PHP страница для обработки редиректов
- **`.htaccess`** - правила маршрутизации для Apache

### 📤 Что нужно загрузить на сервер:

1. **`player.php`** - в корень сайта (где находится `index.html`)
2. **`.htaccess`** - в корень сайта (если его еще нет, или добавьте правила в существующий)

### ⚙️ Как это работает:

- Пользователь переходит на `https://hockey-stars.com/player/{id}`
- Apache перенаправляет на `player.php?id={id}` (благодаря `.htaccess`)
- `player.php` определяет платформу и редиректит в App Store/Google Play или открывает приложение

## 📱 Как это работает

1. **Пользователь сканирует QR-код** на телефоне без приложения
2. **Открывается веб-страница** `https://hockey-stars.com/player/{id}`
3. **Страница определяет платформу:**
   - **iOS**: Пытается открыть `hockeystars://player/{id}`, если не получается - редиректит на App Store
   - **Android**: Использует Intent URL с автоматическим fallback на Google Play
4. **Пользователь попадает в магазин приложений** для установки

## 🎯 Преимущества

- ✅ Работает на всех устройствах (даже без приложения)
- ✅ Автоматический редирект на правильный магазин
- ✅ Если приложение установлено - открывается напрямую
- ✅ Не требует настройки Universal Links/App Links (хотя их можно добавить позже)

## 🔄 Дополнительная настройка (опционально)

Если хотите использовать Universal Links (iOS) и App Links (Android) для более плавного перехода:

## 📝 Примечание

Файлы `player.php` и `.htaccess` уже созданы и готовы к загрузке на сервер `hockey-stars.com`.

---

## 🔄 Дополнительная настройка (опционально)

Если хотите использовать Universal Links (iOS) и App Links (Android) для более плавного перехода:

1. **Для iOS**: Создайте файл `/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.by.hockeystars.app",
        "paths": ["/player/*"]
      }
    ]
  }
}
```

2. **Для Android**: Создайте файл `/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "by.hockeystars.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

**Примечание**: Эти файлы требуют настройки на сервере и не обязательны для базовой функциональности.

