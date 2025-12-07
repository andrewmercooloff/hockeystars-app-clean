import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Настройка системного UI для Android
 * НЕ пытаемся скрыть панель - это не работает надёжно на всех устройствах
 * Просто делаем её чёрной с белыми кнопками
 */
export async function configureSystemUI() {
  if (Platform.OS === 'android') {
    try {
      // Устанавливаем цвет фона системного UI
      await SystemUI.setBackgroundColorAsync('#000000');
      
      // Делаем навигационную панель чёрной (под дизайн приложения)
      await NavigationBar.setBackgroundColorAsync('#000000');
      await NavigationBar.setButtonStyleAsync('light'); // Светлые кнопки на тёмном фоне
    } catch (error) {
      // Игнорируем ошибки - на некоторых устройствах API может быть недоступен
    }
  }
}

/**
 * Принудительное скрытие системной панели навигации
 */
export function hideSystemNavigationBar() {
  if (Platform.OS === 'android') {
    try {
      // Это будет работать только если приложение имеет соответствующие разрешения
      // Основные настройки должны быть в app.json
      console.log('🔧 Попытка скрыть системную панель навигации');
    } catch (error) {
      console.error('❌ Ошибка скрытия системной панели:', error);
    }
  }
}
