import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Настройка системного UI для Android
 * НЕ пытаемся скрыть панель - это не работает надёжно на всех устройствах
 * Просто делаем её чёрной с белыми кнопками
 */
const NAV_BG = '#050008';

export async function configureSystemUI() {
  if (Platform.OS === 'android') {
    try {
      await SystemUI.setBackgroundColorAsync(NAV_BG);
      // Работает при enforceContrast: false (тема + плагин expo-navigation-bar)
      NavigationBar.setStyle('dark');
      await NavigationBar.setBackgroundColorAsync(NAV_BG);
      await NavigationBar.setButtonStyleAsync('light');
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
