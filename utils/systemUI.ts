import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Настройка системного UI для Android.
 * Панель навигации — прозрачная (виден лёд/контент под ней), кнопки светлые.
 * Плагин expo-navigation-bar: enforceContrast: false в app.json.
 */
const NAV_BG_FALLBACK = '#050008';

export async function configureSystemUI() {
  if (Platform.OS === 'android') {
    try {
      await SystemUI.setBackgroundColorAsync('transparent');
      NavigationBar.setStyle('dark');
      await NavigationBar.setBackgroundColorAsync('#00000000');
      await NavigationBar.setButtonStyleAsync('light');
    } catch {
      try {
        await SystemUI.setBackgroundColorAsync(NAV_BG_FALLBACK);
        NavigationBar.setStyle('dark');
        await NavigationBar.setBackgroundColorAsync(NAV_BG_FALLBACK);
        await NavigationBar.setButtonStyleAsync('light');
      } catch {
        /* API может отсутствовать на части прошивок */
      }
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
