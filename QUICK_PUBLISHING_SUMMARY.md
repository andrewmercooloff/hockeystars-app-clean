# 🚀 Быстрое руководство по публикации HockeyStars

## 📱 Краткий план действий

### 1. Подготовка (1-2 дня)
- [ ] Создать аккаунт Google Play Developer ($25)
- [ ] Создать Apple Developer Account ($99/год)
- [ ] Настроить Google Service Account
- [ ] Подготовить иконки и скриншоты
- [ ] Написать описание приложения

### 2. Настройка проекта (30 минут)
- [ ] Обновить `app.json` с правильными идентификаторами
- [ ] Настроить `eas.json` для публикации
- [ ] Добавить `google-service-account.json` в корень проекта

### 3. Сборка и публикация (2-4 часа)

#### Android (Google Play):
```bash
# Сборка AAB для Google Play
eas build --platform android --profile production

# Публикация в Google Play
eas submit --platform android --profile production
```

#### iOS (App Store):
```bash
# Сборка для App Store
eas build --platform ios --profile production

# Публикация в App Store
eas submit --platform ios --profile production
```

## 🎯 Ключевые моменты

### Для Google Play:
- **Формат**: AAB (Android App Bundle)
- **Стоимость**: $25 единоразово
- **Время проверки**: 1-3 дня
- **Требования**: Google Service Account

### Для App Store:
- **Формат**: IPA
- **Стоимость**: $99/год
- **Время проверки**: 1-7 дней
- **Требования**: Apple Developer Account

## 📊 Ожидаемые результаты

### После публикации:
- **Google Play**: Приложение появится в магазине через 1-3 дня
- **App Store**: Приложение появится в магазине через 1-7 дней
- **Обновления**: Автоматические обновления через EAS Submit

### Мониторинг:
- **Google Play Console**: Статистика установок, рейтингов, отзывов
- **App Store Connect**: Метрики продаж, установок, рейтингов

## 🚨 Важные замечания

1. **Безопасность**: Никогда не коммитьте `google-service-account.json` в Git
2. **Тестирование**: Всегда тестируйте перед публикацией
3. **Версионирование**: Обновляйте версию перед каждой публикацией
4. **Соответствие**: Следуйте правилам магазинов приложений

## 📞 Поддержка

- **Expo**: [docs.expo.dev](https://docs.expo.dev)
- **Google Play**: [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)
- **App Store**: [developer.apple.com/support](https://developer.apple.com/support)
