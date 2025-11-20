# Исправление ошибки `global._createSerializableNumber`

## Проблема
Ошибка возникает из-за проблем с настройкой или версиями `react-native-worklets-core` и `react-native-worklets`.

## Решение

### Шаг 1: Очистка и переустановка зависимостей

**Для Windows:**
```bash
# Удаляем node_modules
rmdir /s /q node_modules

# Удаляем lock файлы
del /f package-lock.json
del /f yarn.lock

# Очищаем npm кеш
npm cache clean --force

# Переустанавливаем зависимости
npm install
```

**Для Mac/Linux:**
```bash
# Удаляем node_modules и lock файлы
rm -rf node_modules
rm -f package-lock.json yarn.lock

# Очищаем npm кеш
npm cache clean --force

# Переустанавливаем зависимости
npm install
```

### Шаг 2: Очистка кеша Metro/Expo

```bash
# Запустите с очисткой кеша
npx expo start --clear
```

Или используйте скрипт:
- Windows: `fix-worklets.bat`
- Mac/Linux: `bash fix-worklets.sh`

### Шаг 3: Проверка версий

Убедитесь, что версии совместимы:

```json
{
  "react-native-vision-camera": "^4.7.2",
  "react-native-reanimated": "~4.1.3",
  "react-native-worklets": "^0.6.1",
  "react-native-worklets-core": "^1.6.2"
}
```

### Шаг 4: Проверка babel.config.js

Убедитесь, что `react-native-reanimated/plugin` указан **последним** в списке плагинов:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin должен быть последним
      'react-native-reanimated/plugin',
    ],
  };
};
```

### Шаг 5: Пересборка нативного кода (если нужно)

Если проблема сохраняется после очистки кеша:

**Android:**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

**iOS:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

## Дополнительные проверки

1. Убедитесь, что в worklet-функциях используются только сериализуемые данные (примитивы, простые объекты)
2. Не передавайте функции напрямую в worklet - используйте `runOnJS` и refs
3. Проверьте, что все зависимости установлены корректно: `npm list react-native-worklets-core react-native-worklets react-native-reanimated`

## Если проблема сохраняется

1. Проверьте логи Metro bundler на наличие других ошибок
2. Убедитесь, что используете последние стабильные версии
3. Проверьте официальную документацию: https://docs.swmansion.com/react-native-worklets/

















