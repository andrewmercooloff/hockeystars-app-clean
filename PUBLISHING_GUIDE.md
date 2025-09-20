# 🚀 Руководство по публикации HockeyStars

## 📋 Предварительные требования

### Для Google Play Store:
- [ ] Аккаунт разработчика Google Play ($25)
- [ ] Google Service Account настроен
- [ ] `google-service-account.json` файл в корне проекта

### Для Apple App Store:
- [ ] Apple Developer Account ($99/год)
- [ ] App Store Connect доступ
- [ ] Apple Team ID
- [ ] App Store Connect App ID

## 🔧 Настройка проекта

### 1. Обновление версии
Перед каждой публикацией обновляйте версию в `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

### 2. Проверка конфигурации
Убедитесь, что в `eas.json` правильно настроены профили:

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

## 🏗️ Сборка приложения

### Для Android (Google Play):
```bash
# Сборка AAB для Google Play
eas build --platform android --profile production

# Сборка APK для тестирования
eas build --platform android --profile apk
```

### Для iOS (App Store):
```bash
# Сборка для App Store
eas build --platform ios --profile production
```

## 📤 Публикация

### Google Play Store:
```bash
# Автоматическая публикация в Google Play
eas submit --platform android --profile production
```

### Apple App Store:
```bash
# Автоматическая публикация в App Store
eas submit --platform ios --profile production
```

## 🔄 Процесс обновления

### 1. Обновление кода
1. Внесите изменения в код
2. Обновите версию в `app.json`
3. Закоммитьте изменения

### 2. Сборка новой версии
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 3. Публикация обновления
```bash
# Android
eas submit --platform android --profile production

# iOS
eas submit --platform ios --profile production
```

## 📊 Мониторинг

### Google Play Console:
- [Google Play Console](https://play.google.com/console)
- Отслеживайте установки, рейтинги, отзывы
- Анализируйте статистику

### App Store Connect:
- [App Store Connect](https://appstoreconnect.apple.com/)
- Отслеживайте продажи, установки, рейтинги
- Анализируйте метрики

## 🚨 Важные моменты

### Безопасность:
- Никогда не коммитьте `google-service-account.json` в Git
- Добавьте файл в `.gitignore`
- Храните ключи в безопасном месте

### Тестирование:
- Всегда тестируйте приложение перед публикацией
- Используйте TestFlight для iOS
- Используйте Internal Testing для Android

### Соответствие правилам:
- Следуйте [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- Следуйте [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## 📞 Поддержка

### Полезные ссылки:
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

### Контакты:
- Expo Support: [support.expo.dev](https://support.expo.dev)
- Google Play Support: [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)
- Apple Developer Support: [developer.apple.com/support](https://developer.apple.com/support)
