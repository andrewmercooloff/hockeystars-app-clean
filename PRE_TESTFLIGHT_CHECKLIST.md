# Чеклист перед сборкой для TestFlight

## ✅ Обязательные проверки

### 1. Версия и Build Number
- [ ] Версия обновлена в `app.json` (текущая: 1.0.1)
- [ ] `runtimeVersion` обновлен (текущий: 1.0.1)
- [ ] Build number будет автоматически увеличен (`autoIncrement: true` в eas.json)

### 2. Конфигурация
- [ ] Bundle identifier правильный: `by.hockeystars.app`
- [ ] EAS project ID указан: `ccb608ca-e849-4a98-b337-d38863d3ebff`
- [ ] Apple Team ID указан: `FAL33J6D2V`
- [ ] Apple ID указан: `am654@yandex.ru`

### 3. Разрешения
- [ ] `NSMicrophoneUsageDescription` указан в `app.json`
- [ ] `NSCameraUsageDescription` указан в `app.json`
- [ ] Плагин `expo-av` настроен с `microphonePermission`
- [ ] `UIBackgroundModes` включает `audio`

### 4. Зависимости
- [ ] Все зависимости установлены (`npm install --legacy-peer-deps`)
- [ ] Нет конфликтов версий
- [ ] `react-native-audio-recorder-player: ^4.5.0` присутствует
- [ ] `expo-av: ~16.0.7` присутствует

### 5. Файлы ресурсов
- [ ] Иконка приложения: `assets/images/icon.png`
- [ ] Splash screen: `assets/images/splash-icon.png`
- [ ] Иконка уведомлений: `assets/images/ic_notification.png`
- [ ] Звук уведомлений: `assets/not.m4a`

### 6. Локальное тестирование
- [ ] Приложение запускается без ошибок (`npm start`)
- [ ] Главная страница работает корректно
- [ ] Аудио-радар работает (микрофон включается, пики двигаются)
- [ ] Все основные функции работают
- [ ] Протестировано на реальном iOS устройстве

### 7. Код
- [ ] Нет критических ошибок TypeScript
- [ ] Нет console.error в production коде (или они обработаны)
- [ ] Все импорты корректны
- [ ] Нет условных импортов, которые могут не работать в production

### 8. Git
- [ ] Все изменения закоммичены
- [ ] Нет неотслеживаемых файлов (кроме тех, что в .gitignore)
- [ ] Текущая ветка: `master`

## 🚀 Команды для сборки

### Подготовка (выполнить скрипт):
```bash
# Windows
prepare-testflight.bat

# macOS/Linux
chmod +x prepare-testflight.sh
./prepare-testflight.sh
```

### Сборка:
```bash
# Сборка production версии
eas build --platform ios --profile production --clear-cache

# После успешной сборки - загрузка в TestFlight
eas submit --platform ios --profile production
```

### Альтернатива через Xcode:
```bash
# Генерация нативного проекта
npx expo prebuild --platform ios

# Открыть в Xcode
open ios/HockeyStars.xcworkspace

# В Xcode: Product → Archive → Distribute App → App Store Connect
```

## ⚠️ Важные замечания

1. **Всегда тестируй локально перед сборкой**
   - Development build должен работать идеально
   - Если что-то не работает в development, не будет работать и в production

2. **Проверь логи после сборки**
   - В TestFlight проверь логи через Xcode Console
   - Ищи ошибки инициализации модулей

3. **Нативные модули**
   - После изменений в нативных модулях нужна полная пересборка
   - Не используй кешированные билды

4. **Версия**
   - Каждая новая сборка должна иметь новый build number
   - Версия должна быть выше предыдущей в App Store Connect

## 📋 После сборки

1. Дождись обработки билда в App Store Connect (10-30 минут)
2. Установи на реальное устройство через TestFlight
3. Проверь:
   - Главная страница работает без ошибок
   - Аудио-радар работает (микрофон, пики, детекция)
   - Все функции работают корректно
4. Если есть проблемы - проверь логи и исправь

## 🔧 Если что-то пошло не так

1. Проверь логи сборки в EAS
2. Проверь логи в TestFlight (Xcode Console)
3. Сравни с предыдущей рабочей версией
4. Используй `TESTFLIGHT_BUILD_GUIDE.md` для решения проблем

