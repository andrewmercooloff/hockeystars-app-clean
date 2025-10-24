# Исправление ошибки Image компонента на Android

## 🐛 **Проблема**
```
ERROR [Error: The <Image> component cannot have defaultSource and loadingIndicatorSource at the same time. Please use either defaultSource or loadingIndicatorSource.]
```

## ✅ **Исправление**
**Файл: `app/player/[id].tsx` (строки 3203-3204)**

### Было:
```tsx
defaultSource={{ uri: 'https://via.placeholder.com/60/333/fff?text=Player' }}
loadingIndicatorSource={{ uri: 'https://via.placeholder.com/60/333/fff?text=...' }}
```

### Стало:
```tsx
defaultSource={{ uri: 'https://via.placeholder.com/60/333/fff?text=Player' }}
```

## 📝 **Объяснение**
React Native не позволяет одновременно использовать `defaultSource` и `loadingIndicatorSource` в компоненте `<Image>`. 

- `defaultSource` - изображение, которое показывается до загрузки основного изображения
- `loadingIndicatorSource` - изображение, которое показывается во время загрузки

Нужно выбрать только один из них. В данном случае `defaultSource` более подходящий, так как он обеспечивает лучший UX.

## 🚀 **Результат**
- ❌ Ошибка Image компонента устранена
- ✅ Приложение корректно работает на Android
- ✅ Аватары друзей отображаются правильно

## 📱 **Дополнительные замечания**
Из логов также видно предупреждение о push-уведомлениях в Expo Go:
```
WARN expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53.
```

Это нормально для разработки в Expo Go. Для полного тестирования push-уведомлений нужно использовать development build или TestFlight.
