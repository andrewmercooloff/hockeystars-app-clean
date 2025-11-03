import 'expo-router/entry';

// Отключаем предупреждения в консоли
import { LogBox, Platform } from 'react-native';

// Импортируем CSS для веб-версии
if (Platform.OS === 'web') {
  // Устанавливаем черный фон для веб-версии
  if (typeof document !== 'undefined') {
    document.body.style.backgroundColor = '#000000';
    const root = document.getElementById('root');
    if (root) {
      root.style.backgroundColor = '#000000';
    }
  }
}

// В режиме разработки показываем предупреждения для отладки
// Отключаем только в продакшене
if (typeof __DEV__ === 'undefined' || !__DEV__) {
  LogBox.ignoreAllLogs();
} 