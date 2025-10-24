import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Сервис для управления звуками сообщений и push-уведомлений
 * Воспроизводит звуки клюшки при отправке и получении сообщений
 * Воспроизводит звук уведомления при push-уведомлениях
 */

// Объекты для хранения загруженных звуков
let outgoingSound: Audio.Sound | null = null;
let incomingSound: Audio.Sound | null = null;
let notificationSound: Audio.Sound | null = null;

// Флаг инициализации
let isInitialized = false;

// Дебаунс для предотвращения повторных вызовов звуков
let lastOutgoingSoundTime = 0;
let lastIncomingSoundTime = 0;
let lastNotificationSoundTime = 0;
const SOUND_DEBOUNCE_MS = 1000; // 1000ms между звуками одного типа

/**
 * Инициализация аудио системы и загрузка звуков
 */
export async function initializeSounds(): Promise<void> {
  if (isInitialized) return;

  try {
    // Небольшая задержка для полной загрузки приложения
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Настраиваем аудио режим для TestFlight и продакшена
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Разрешаем воспроизведение в фоне
        playsInSilentModeIOS: true, // Воспроизводим даже в беззвучном режиме
        shouldDuckAndroid: false, // Не приглушаем другие звуки
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
    } catch (audioModeError) {
      console.log('⚠️ Ошибка настройки аудио режима (продолжаем без него):', audioModeError.message);
      // Продолжаем без настройки аудио режима
    }

    // Загружаем звук отправки сообщения (out.mp3)
    const { sound: outSound } = await Audio.Sound.createAsync(
      require('../assets/out.mp3'),
      { shouldPlay: false, volume: 0.8 }
    );
    outgoingSound = outSound;

    // Загружаем звук получения сообщения (in.m4a)
    const { sound: inSound } = await Audio.Sound.createAsync(
      require('../assets/in.m4a'),
      { shouldPlay: false, volume: 0.8 }
    );
    incomingSound = inSound;

    // Загружаем звук push-уведомления (not.m4a)
    const { sound: notSound } = await Audio.Sound.createAsync(
      require('../assets/not.m4a'),
      { shouldPlay: false, volume: 0.9 }
    );
    notificationSound = notSound;

    isInitialized = true;
  } catch (error) {
    console.error('❌ Ошибка инициализации звуков:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

/**
 * Воспроизведение звука отправки сообщения
 */
export async function playOutgoingMessageSound(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastOutgoingSoundTime < SOUND_DEBOUNCE_MS) {
      return;
    }
    lastOutgoingSoundTime = now;

    if (!isInitialized) {
      await initializeSounds();
    }

    if (outgoingSound) {
      // Останавливаем звук если он уже играет
      await outgoingSound.stopAsync();
      // Перематываем в начало
      await outgoingSound.setPositionAsync(0);
      // Воспроизводим
      await outgoingSound.playAsync();
    }
  } catch (error) {
    console.error('❌ Ошибка воспроизведения звука отправки:', error);
  }
}

/**
 * Воспроизведение звука получения сообщения
 */
export async function playIncomingMessageSound(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastIncomingSoundTime < SOUND_DEBOUNCE_MS) {
      return;
    }
    lastIncomingSoundTime = now;

    if (!isInitialized) {
      await initializeSounds();
    }

    if (incomingSound) {
      // Проверяем, не играет ли уже звук
      const status = await incomingSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        return;
      }
      
      // Останавливаем звук если он уже играет
      await incomingSound.stopAsync();
      // Перематываем в начало
      await incomingSound.setPositionAsync(0);
      // Воспроизводим
      await incomingSound.playAsync();
    }
  } catch (error) {
    console.error('❌ Ошибка воспроизведения звука получения:', error);
  }
}

/**
 * Воспроизведение звука push-уведомления
 */
export async function playNotificationSound(): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastNotificationSoundTime < SOUND_DEBOUNCE_MS) {
      return;
    }
    lastNotificationSoundTime = now;

    if (!isInitialized) {
      await initializeSounds();
    }

    if (notificationSound) {
      // Останавливаем звук если он уже играет
      await notificationSound.stopAsync();
      // Перематываем в начало
      await notificationSound.setPositionAsync(0);
      // Воспроизводим
      await notificationSound.playAsync();
      console.log('🔔 Звук push-уведомления');
    }
  } catch (error) {
    console.error('❌ Ошибка воспроизведения звука уведомления:', error);
  }
}

/**
 * Освобождение ресурсов (вызывается при закрытии приложения)
 */
export async function unloadSounds(): Promise<void> {
  try {
    if (outgoingSound) {
      await outgoingSound.unloadAsync();
      outgoingSound = null;
    }
    if (incomingSound) {
      await incomingSound.unloadAsync();
      incomingSound = null;
    }
    if (notificationSound) {
      await notificationSound.unloadAsync();
      notificationSound = null;
    }
    isInitialized = false;
    console.log('🔇 Звуки сообщений и уведомлений выгружены');
  } catch (error) {
    console.error('❌ Ошибка выгрузки звуков:', error);
  }
}

/**
 * Проверка, инициализированы ли звуки
 */
export function areSoundsInitialized(): boolean {
  return isInitialized;
}
