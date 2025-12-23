# Google Play Tester Management Script

## Установка зависимостей

Перед использованием скрипта необходимо установить зависимости:

```bash
cd server
npm install
```

Это установит библиотеку `googleapis`, необходимую для работы с Google Play Developer API.

## Настройка

1. Убедитесь, что файл `google-service-account.json` находится в корне проекта
2. Service account должен иметь права на управление тестировщиками в Google Play Console
3. В Google Play Console нужно предоставить доступ service account email к приложению

## Использование

Скрипт вызывается автоматически через PHP endpoint `/add-tester.php` при отправке формы на сайте.

Для ручного тестирования:

```bash
node server/scripts/add-tester.js user@example.com
```

## Настройка Google Play Console

1. Перейдите в Google Play Console → Ваше приложение → Тестирование → Internal testing
2. В разделе "Testers" добавьте service account email в список тестировщиков
3. Убедитесь, что service account имеет роль "Admin" или "Release manager" в Google Play Console




