# 🚀 Отправка последней сборки в TestFlight

## Быстрый старт

### Вариант 1: Через npm (рекомендуется)

```bash
npm run submit:testflight
```

Или напрямую через EAS:

```bash
npm run submit:ios
```

### Вариант 2: Через скрипты

**Windows:**
```bash
submit-latest-to-testflight.bat
```

**Linux/Mac:**
```bash
./submit-latest-to-testflight.sh
```

**Node.js скрипт (кроссплатформенный):**
```bash
node scripts/submit-latest-build.js
```

## Что делает скрипт

1. ✅ Проверяет наличие EAS CLI
2. ✅ Проверяет авторизацию в EAS
3. ✅ Находит последнюю завершенную сборку iOS
4. ✅ Отправляет её в App Store Connect для TestFlight

## Требования

- Установлен EAS CLI: `npm install -g eas-cli`
- Авторизован в EAS: `eas login`
- Настроены credentials в `eas.json`
- Есть хотя бы одна завершенная сборка iOS

## Проверка статуса

После отправки проверьте статус в App Store Connect:
- https://appstoreconnect.apple.com/apps/6753738837/testflight/ios

## Устранение проблем

### Ошибка: "Нет завершенных сборок"

**Решение:**
1. Проверьте список сборок:
   ```bash
   eas build:list --platform ios
   ```
2. Дождитесь завершения сборки
3. Или создайте новую сборку:
   ```bash
   eas build --platform ios --profile production
   ```

### Ошибка: "Не авторизован в EAS"

**Решение:**
```bash
eas login
```

### Ошибка: "Проблемы с credentials"

**Решение:**
```bash
eas credentials
```

Выберите: iOS → production → проверьте все credentials

## Автоматическая отправка после сборки

Если хотите автоматически отправлять сборку после её завершения, используйте флаг `--submit`:

```bash
eas build --platform ios --profile production --submit
```

Или с `--non-interactive`:

```bash
eas build --platform ios --profile production --non-interactive --submit
```

## Полезные команды

### Просмотр списка сборок
```bash
eas build:list --platform ios
```

### Просмотр последней сборки
```bash
eas build:list --platform ios --limit 1
```

### Просмотр деталей сборки
```bash
eas build:view [BUILD_ID]
```

### Отправка конкретной сборки
```bash
eas submit --platform ios --id [BUILD_ID]
```

## Примечания

- ⚠️ Скрипт использует флаг `--latest`, который находит последнюю **завершенную** сборку
- ⚠️ Если сборка еще обрабатывается, скрипт найдет предыдущую завершенную
- ⚠️ После отправки Apple обрабатывает сборку 5-10 минут
- ⚠️ Убедитесь, что используете правильный профиль (`production`)






