import 'expo-router/entry';

// Отключаем предупреждения в консоли
import { LogBox } from 'react-native';

// В режиме разработки показываем предупреждения для отладки
// Отключаем только в продакшене (TestFlight, App Store)
const isProduction = typeof __DEV__ === 'undefined' || !__DEV__;

if (isProduction) {
  // Отключаем все предупреждения React Native в production
  LogBox.ignoreAllLogs();
  
  // Сохраняем оригинальные функции для критичных ошибок
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // В production отключаем все логи, кроме критичных ошибок
  console.log = () => {}; // Полностью отключаем console.log
  console.warn = () => {}; // Полностью отключаем console.warn
  
  // console.error оставляем только для действительно критичных ошибок
  // Можно добавить фильтрацию, если нужно
  console.error = (...args) => {
    // В production можно полностью отключить или оставить только критичные
    // Для TestFlight лучше оставить минимальное логирование критичных ошибок
    // originalError.apply(console, args); // Раскомментируйте, если нужны критичные ошибки
  };
} else {
  // В режиме разработки фильтруем только специфичные ошибки
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('Text strings must be rendered within a <Text> component')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('Text strings must be rendered within a <Text> component')) {
      return;
    }
    originalError.apply(console, args);
  };
} 