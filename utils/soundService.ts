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

/**
 * Инициализация аудио системы и загрузка звуков
 */
export async function initializeSounds(): Promise<void> {
  if (isInitialized) return;

  try {
    // Настраиваем аудио режим (упрощенная версия для совместимости)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Загружаем звук отправки сообщения (out.m4a)
    const { sound: outSound } = await Audio.Sound.createAsync(
      require('../assets/out.m4a'),
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
    console.log('🔊 Звуки сообщений и уведомлений инициализированы');
  } catch (error) {
    console.error('❌ Ошибка инициализации звуков:', error);
  }
}

/**
 * Воспроизведение звука отправки сообщения
 */
export async function playOutgoingMessageSound(): Promise<void> {
  try {
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
      console.log('🔊 Звук отправки сообщения');
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
    if (!isInitialized) {
      await initializeSounds();
    }

    if (incomingSound) {
      // Останавливаем звук если он уже играет
      await incomingSound.stopAsync();
      // Перематываем в начало
      await incomingSound.setPositionAsync(0);
      // Воспроизводим
      await incomingSound.playAsync();
      console.log('🔊 Звук получения сообщения');
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
