# 🏒 Исправление границ шайб для Android и Web

## 🐛 Проблема
На iPhone шайбы перемещались в пределах виртуальной ледовой коробки, но на Android и в веб-версии шайбы улетали за пределы экрана направо и вниз.

## 🔧 Решение
Создали платформо-зависимые границы: для iPhone используются исходные границы, для Android и Web - уменьшенные границы. Исправили преждевременное отталкивание шайб - теперь они отталкиваются только при реальном столкновении.

## 📝 Внесенные изменения

### 1. Генерация начальных позиций
**Было:**
```typescript
newX = 5 + Math.random() * (width - 15 - puckSize);
newY = 5 + Math.random() * (height - 235 - puckSize);
```

**Стало:**
```typescript
// Платформо-зависимые границы
const getBoundaries = () => {
  if (Platform.OS === 'ios') {
    return { leftOffset: 5, topOffset: 5, rightOffset: 5, bottomOffset: 235 };
  } else {
    return { leftOffset: 10, topOffset: 10, rightOffset: 160, bottomOffset: 425 };
  }
};

newX = boundaries.leftOffset + Math.random() * (width - boundaries.rightOffset - puckSize);
newY = boundaries.topOffset + Math.random() * (height - boundaries.bottomOffset - puckSize);
```

### 2. Обработка коллизий со стенами
**Было:**
```typescript
// Правая граница
if (newX <= 5 || newX >= width - 15 - puckSize) {
  newX = Math.max(5, Math.min(width - 15 - puckSize, newX));
}

// Нижняя граница
if (newY <= 5 || newY >= height - 225 - puckSize) {
  newY = Math.max(5, Math.min(height - 225 - puckSize, newY));
}
```

**Стало:**
```typescript
// Платформо-зависимые границы
if (newX <= boundaries.leftOffset || newX >= width - boundaries.rightOffset - puckSize) {
  newX = Math.max(boundaries.leftOffset, Math.min(width - boundaries.rightOffset - puckSize, newX));
}

if (newY <= boundaries.topOffset || newY >= height - (boundaries.bottomOffset - 10) - puckSize) {
  newY = Math.max(boundaries.topOffset, Math.min(height - (boundaries.bottomOffset - 10) - puckSize, newY));
}
```

### 3. Отталкивание шайб друг от друга
**Было:**
```typescript
const minDistance = puckSize * 1.02;
const pushForce = overlap * 0.2;
const repulsionForce = 0.05;
```

**Стало:**
```typescript
// Платформо-зависимое отталкивание шайб
const collisionDistance = Platform.OS === 'ios' ? puckSize * 1.02 : puckSize * 0.5;
const pushForce = overlap * 0.2;
const separationThreshold = Platform.OS === 'ios' ? puckSize * 0.6 : puckSize * 0.3;
```

### 4. Платформо-зависимая скорость
**Было:**
```typescript
vx: (Math.random() - 0.5) * 0.39,
vy: (Math.random() - 0.5) * 0.39,
const maxSpeed = 5.2;
const minSpeed = 0.208;
```

**Стало:**
```typescript
// Платформо-зависимая скорость
const speedMultiplier = Platform.OS === 'ios' ? 0.39 : 0.32;
vx: (Math.random() - 0.5) * speedMultiplier,
vy: (Math.random() - 0.5) * speedMultiplier,
const maxSpeed = Platform.OS === 'ios' ? 5.2 : 4.2;
const minSpeed = Platform.OS === 'ios' ? 0.208 : 0.17;
```

## 🎯 Результат
- **iPhone**: используются границы от самых краев экрана (льда) (`left: 5, top: 5, right: width - 5, bottom: height - 235`), исходное отталкивание (`puckSize * 1.02`) и высокая скорость (`0.39`)
- **Android/Web**: используются уменьшенные границы с отступами (`left: 10, top: 10, right: width - 160, bottom: height - 425`), улучшенное отталкивание (`puckSize * 0.5`) и средняя скорость (`0.32`)
- **Отталкивание шайб**: платформо-зависимое - для iPhone как было, для Android/Web улучшено для предотвращения наложения и уменьшено расстояние отталкивания
- **Скорость**: платформо-зависимая - для iPhone высокая, для Android/Web средняя для более комфортного восприятия
- Шайбы теперь должны оставаться в пределах видимой области на всех платформах

## 🧪 Тестирование
1. Запустите приложение: `npx expo start`
2. Протестируйте на Android устройстве через Expo Go
3. Протестируйте в веб-версии
4. Убедитесь, что шайбы не выходят за пределы экрана

## 📱 Платформы
- ✅ iPhone (работало корректно)
- 🔧 Android (исправлено)
- 🔧 Web (исправлено)

## 💡 Примечание
Это экспериментальное решение. Созданы платформо-зависимые границы, отталкивание и скорость: для iPhone используются границы от самых краев экрана (льда) с минимальными отступами (5px), высокая скорость (0.39) и исходное отталкивание; для Android и Web - уменьшенные границы с дополнительными отступами (5px сверху, слева и справа), уменьшенная скорость (0.25) и улучшенное отталкивание для предотвращения наложения шайб. Теперь шайбы должны полностью оставаться в пределах видимой области на всех платформах, не наслаиваться друг на друга и двигаться с комфортной скоростью.
