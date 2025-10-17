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

// Отключаем все предупреждения
LogBox.ignoreAllLogs(); 