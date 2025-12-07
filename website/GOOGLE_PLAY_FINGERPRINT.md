# 🔍 Где найти SHA-256 fingerprint в Google Play Console

## 📍 Путь в Google Play Console

### Шаг 1: Откройте раздел "Целостность приложения"

1. В левом меню найдите **"Тестирование и выпуск"** (Testing and release)
2. Прокрутите вниз в подменю
3. Нажмите на **"Целостность приложения"** (App integrity)

### Шаг 2: Найдите "App signing"

В разделе "Целостность приложения" вы увидите:

1. **"App signing"** (Подпись приложения) - это то, что нужно!
2. Там будет раздел **"App signing key certificate"** (Сертификат ключа подписи приложения)
3. Найдите **"SHA-256 certificate fingerprint"**

### Альтернативный путь (если не видите):

1. **"Тестирование и выпуск"** → **"Последние выпуски и наборы"** (Latest releases and bundles)
2. Или **"Тестирование и выпуск"** → **"Рабочая версия"** (Production version)
3. Там должна быть ссылка на **"App signing"**

---

## 📋 Что скопировать

В разделе "App signing" вы увидите что-то вроде:

```
SHA-256 certificate fingerprint
A1:B2:C3:D4:E5:F6:... (64 символа)
```

**Скопируйте весь fingerprint** (с двоеточиями, формат: `XX:XX:XX:XX:...`)

---

## ⚠️ Важно

- Используйте fingerprint из **"App signing key certificate"** (это тот, который Google использует)
- НЕ используйте fingerprint из "Upload key certificate" (это ваш локальный ключ)

---

## 📝 После получения

1. Откройте файл: `website/.well-known/assetlinks.json`
2. Замените `YOUR_SHA256_FINGERPRINT_HERE` на скопированный fingerprint
3. Сохраните файл
4. Загрузите на сервер в папку `.well-known/`

---

## 🎯 Быстрый путь

**Google Play Console** → 
**Тестирование и выпуск** (Testing and release) → 
**Целостность приложения** (App integrity) → 
**App signing** → 
**SHA-256 certificate fingerprint**

