import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

/**
 * Настройка системного UI для Android
 */
export async function configureSystemUI() {
  if (Platform.OS === 'android') {
    try {
      // Скрываем системную панель навигации
      await SystemUI.setBackgroundColorAsync('#000000');
      
      // Пытаемся скрыть навигационную панель
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        // console.log('✅ Навигационная панель скрыта');
      } catch (navError) {
        console.log('⚠️ NavigationBar API недоступен (нормально для Expo Go)');
      }
      
      // console.log('✅ Системный UI настроен для Android');
    } catch (error) {
      console.error('❌ Ошибка настройки системного UI:', error);
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
