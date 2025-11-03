import 'expo-router/entry';

// Отключаем предупреждения в консоли
import { LogBox } from 'react-native';

// В режиме разработки показываем предупреждения для отладки
// Отключаем только в продакшене
if (typeof __DEV__ === 'undefined' || !__DEV__) {
  LogBox.ignoreAllLogs();
}

// Отключаем console.warn
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('Text strings must be rendered within a <Text> component')) {
    return;
  }
  originalWarn.apply(console, args);
};

// Отключаем console.error для этой ошибки
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('Text strings must be rendered within a <Text> component')) {
    return;
  }
  originalError.apply(console, args);
}; 