# Google Play Tester Management - Автоматическое добавление тестировщиков

## Описание

Система автоматически добавляет email пользователей в список тестировщиков закрытого тестирования Google Play Console при нажатии на кнопку "Скачать для Android" на сайте.

## Архитектура

1. **Frontend** (`website/script.js`) - отправляет POST запрос на `/add-tester.php`
2. **PHP прокси** (`website/add-tester.php`) - вызывает Node.js API
3. **Node.js API** (`server/scripts/add-tester-api.js`) - добавляет тестировщика через Google Play API
4. **Точка входа** (`api/app.js`) - запускает API для cPanel

## Быстрая настройка

### 1. Установка зависимостей

**В папке api/:**
```bash
cd ~/api
npm install
```

**В папке server/:**
```bash
cd ~/server
npm install
```

### 2. Google Cloud Console

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите **Google Play Android Developer API**
3. Создайте Service Account → скачайте JSON ключ
4. Сохраните как `google-service-account.json` в корне сайта

### 3. Google Play Console

1. Откройте [Google Play Console](https://play.google.com/console/)
2. Settings → API access → найдите ваш Service Account
3. Grant access → предоставьте права:
   - View app information and download bulk reports
   - Manage production releases
   - Manage testing track releases

### 4. Настройка cPanel

1. Node.js → Create Application
2. Application root: `api`
3. Application URL: `app`
4. Startup File: `app.js`
5. Node.js Version: 18.x или 20.x
6. NPM Install → Restart

### 5. Права доступа

```bash
chmod 600 ~/hockey-stars.com/google-service-account.json
```

## Конфигурация

В `server/scripts/add-tester-api.js`:
- `PACKAGE_NAME` = `'by.hockeystars.app'` (package name приложения)
- `TRACK` = `'internal'` (трек для закрытого тестирования)

## Использование

### Автоматическое (через сайт)

1. Пользователь нажимает "Скачать для Android"
2. Вводит email в модальное окно
3. Email автоматически добавляется в Google Play Console

### Ручное тестирование

```bash
# Тест скрипта напрямую
node server/scripts/add-tester.js user@example.com

# Тест API endpoint
curl -X POST https://hockey-stars.com/app/add-tester \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Устранение проблем

### "Service account not configured"
- Проверьте наличие `google-service-account.json` в корне сайта
- Проверьте права доступа (600)

### "Permission denied" (403)
- Проверьте права Service Account в Google Play Console
- Убедитесь, что Service Account имеет доступ к управлению тестированием

### "App or track not found" (404)
- Проверьте `PACKAGE_NAME` в коде
- Убедитесь, что приложение опубликовано
- Проверьте, что track 'internal' существует

### API не отвечает
- Проверьте, что Node.js приложение запущено в cPanel
- Проверьте логи в cPanel
- Убедитесь, что зависимости установлены

## Логирование

При ошибках API email сохраняется в:
```
website/tester-emails.log
```

Это позволяет добавить тестировщиков вручную, если API недоступен.

## Безопасность

⚠️ **Важно:**
- Не коммитьте `google-service-account.json` в git
- Используйте права 600 для service account файла
- Регулярно проверяйте логи

## Документация

- [DEPLOY_INSTRUCTIONS.txt](../DEPLOY_INSTRUCTIONS.txt) - подробная инструкция по развертыванию
- [Google Play Developer API](https://developers.google.com/android-publisher)




