# Подготовка к TestFlight - Финальный чеклист

## ✅ Выполнено

1. **Зафиксированы версии критичных зависимостей:**
   - `react-native-reanimated: 4.1.4` (было `^4.1.4`)
   - `react-native-worklets-core: 1.6.2` (было `^1.6.2`)
   - `react-native-gesture-handler: 2.28.0` (было `~2.28.0`)
   - `react-native-worklets: 0.5.1` (уже была зафиксирована)

2. **Обновлена версия приложения:**
   - Версия: `1.0.2` (было `1.0.1`)
   - Runtime version: `1.0.2`

3. **Добавлен fallback на expo-av для аудио-радара:**
   - Если `react-native-audio-recorder-player` не работает в production
   - Автоматически переключается на `expo-av` через 3 секунды
   - Использует polling метеринга через `getStatusAsync()` каждые 100ms
   - Полная совместимость с существующей логикой детекции звука

## 📋 Чеклист перед сборкой

### 1. Очистка и переустановка

```bash
# Очистка
rm -rf node_modules
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf android/app/build
rm -rf package-lock.json

# Переустановка с фиксированными версиями
npm install --legacy-peer-deps

# Проверка версий
npm list react-native-reanimated react-native-worklets react-native-worklets-core react-native-gesture-handler
```

**Ожидаемый результат:**
```
react-native-reanimated@4.1.4
react-native-worklets@0.5.1
react-native-worklets-core@1.6.2
react-native-gesture-handler@2.28.0
```

### 2. Обновление iOS зависимостей

```bash
cd ios
pod install
cd ..
```

### 3. Локальное тестирование

```bash
# Запуск в development режиме
npm start

# Проверь на реальном устройстве:
# ✅ Главная страница работает без ошибок
# ✅ Шайбы не вылетают за границы
# ✅ Шайбы правильно отталкиваются друг от друга
# ✅ Аудио-радар работает (микрофон, пики, детекция)
# ✅ Все основные функции работают
```

### 4. Проверка конфигурации

- [ ] `app.json`: версия `1.0.2`, runtimeVersion `1.0.2`
- [ ] `package.json`: версии зафиксированы (без ^ и ~ для критичных)
- [ ] `eas.json`: production профиль настроен
- [ ] Разрешения для микрофона указаны в `app.json`
- [ ] Bundle identifier: `by.hockeystars.app`

### 5. Сборка для TestFlight

```bash
# Вариант 1: Через EAS Build (рекомендуется)
eas build --platform ios --profile production --clear-cache

# Вариант 2: Если нужно указать версию вручную
eas build --platform ios --profile production --clear-cache --non-interactive
```

### 6. После сборки

1. **Дождись обработки билда** (10-30 минут)
2. **Загрузи в App Store Connect** (если не автоматически)
3. **Проверь в TestFlight:**
   - [ ] Установка проходит успешно
   - [ ] Главная страница работает без ошибок
   - [ ] Шайбы не вылетают за границы
   - [ ] Шайбы правильно отталкиваются
   - [ ] Аудио-радар работает (микрофон включается, пики двигаются, звук детектируется)
   - [ ] Все основные функции работают

## 🔧 Если проблемы остались

### Проблема: Шайбы все еще вылетают за границы

1. **Проверь установленные версии:**
   ```bash
   npm list | grep -E "reanimated|worklets|gesture"
   ```

2. **Проверь package-lock.json:**
   - Убедись, что версии совпадают с package.json

3. **Проверь нативные зависимости:**
   ```bash
   cd ios
   pod install --repo-update
   cd ..
   ```

4. **Собери с полной очисткой:**
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

### Проблема: Аудио-радар не работает

См. раздел "Проблема 2" в `TESTFLIGHT_BUILD_GUIDE.md`

## 📝 Важные замечания

1. **Всегда тестируй локально перед сборкой**
   - Если не работает в development, не будет работать и в production

2. **Не обновляй зависимости перед production сборкой**
   - Используй только зафиксированные версии

3. **Проверяй версии после npm install**
   - Убедись, что установились правильные версии

4. **Используй --clear-cache при сборке**
   - Это гарантирует чистую сборку без кешированных артефактов

## 🎯 Команды для быстрого старта

```bash
# Полная подготовка к сборке
rm -rf node_modules .expo ios/build package-lock.json && \
npm install --legacy-peer-deps && \
cd ios && pod install && cd .. && \
npm list react-native-reanimated react-native-worklets react-native-worklets-core react-native-gesture-handler

# Сборка
eas build --platform ios --profile production --clear-cache
```

## 📚 Дополнительные документы

- `TESTFLIGHT_BUILD_GUIDE.md` - Подробное руководство по сборке
- `FIXED_VERSIONS.md` - Информация о зафиксированных версиях

