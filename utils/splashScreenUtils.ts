import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

// Флаг для отслеживания, был ли splash screen скрыт
let splashScreenHidden = false;

/**
 * Безопасно скрывает splash screen, предотвращая повторные вызовы и ошибки
 */
export async function safeHideSplashScreen(): Promise<void> {
  // Если уже скрыт, не делаем ничего
  if (splashScreenHidden) {
    return;
  }

  try {
    // Проверяем, что мы не на веб-платформе (где splash screen может работать по-другому)
    if (Platform.OS === 'web') {
      splashScreenHidden = true;
      return;
    }

    await SplashScreen.hideAsync();
    splashScreenHidden = true;
    console.log('✅ Splash screen успешно скрыт');
  } catch (error: any) {
    // Игнорируем ошибки, если splash screen уже скрыт или не зарегистрирован
    const errorMessage = error?.message || String(error);
    if (
      errorMessage.includes('not registered') ||
      errorMessage.includes('already hidden') ||
      errorMessage.includes('No native splash screen')
    ) {
      splashScreenHidden = true;
      console.log('ℹ️ Splash screen уже скрыт или не зарегистрирован');
    } else {
      console.warn('⚠️ Неожиданная ошибка при скрытии splash screen:', errorMessage);
    }
  }
}

/**
 * Сбрасывает флаг (для тестирования или перезагрузки)
 */
export function resetSplashScreenFlag(): void {
  splashScreenHidden = false;
}

