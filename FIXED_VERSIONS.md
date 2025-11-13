# Зафиксированные версии зависимостей для TestFlight

## Проблема
В TestFlight (production build) шайбы вылетают за границы экрана, хотя в development build все работает корректно. Это происходит из-за того, что в production могут установиться другие версии зависимостей из-за символов `^` и `~` в package.json.

## Решение
Зафиксированы точные версии критичных зависимостей, связанных с анимацией и физикой шайб:

### Критичные зависимости (зафиксированы без ^ и ~):

1. **react-native-reanimated**: `4.1.4` (было `^4.1.4`)
   - Отвечает за анимации и работу с worklets
   - Версия 4.1.4 проверена и работает корректно

2. **react-native-worklets**: `0.5.1` (уже зафиксирована)
   - Критична для работы reanimated
   - Версия 0.5.0 была в коммите 26cc48a, но 0.5.1 также работает

3. **react-native-worklets-core**: `1.6.2` (было `^1.6.2`)
   - Ядро для работы worklets
   - Должна совпадать с версией react-native-worklets

4. **react-native-gesture-handler**: `2.28.0` (было `~2.28.0`)
   - Отвечает за обработку жестов
   - Может влиять на расчет границ и позиций

## Почему это важно

В production сборке:
- `npm install` может установить более новые минорные версии из-за `^`
- Это может привести к несовместимости между модулями
- Размеры экрана и границы могут рассчитываться по-другому
- Физика столкновений может работать иначе

## Проверка перед сборкой

Перед каждой сборкой для TestFlight проверяй:

```bash
# Проверь установленные версии
npm list react-native-reanimated react-native-worklets react-native-worklets-core react-native-gesture-handler

# Должны быть:
# react-native-reanimated@4.1.4
# react-native-worklets@0.5.1
# react-native-worklets-core@1.6.2
# react-native-gesture-handler@2.28.0
```

## Если проблема повторится

1. Проверь, что версии точно совпадают:
   ```bash
   cat package.json | grep -E "reanimated|worklets|gesture-handler"
   ```

2. Очисти кеш и переустанови:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Проверь нативные зависимости:
   ```bash
   cd ios && pod install && cd ..
   ```

4. Собери с очисткой кеша:
   ```bash
   eas build --platform ios --profile production --clear-cache
   ```

## История проблемы

- **Коммит 26cc48a**: Добавлен `react-native-worklets@0.5.0` для совместимости с reanimated
- **Проблема**: В TestFlight шайбы вылетают за границы
- **Причина**: Версии с `^` и `~` могут обновиться в production
- **Решение**: Зафиксированы точные версии без символов обновления



