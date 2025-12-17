import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { playNotificationSound } from './soundService';

// Настройка обработчика уведомлений
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Проверяем, в фоне ли приложение
    const appState = AppState.currentState;
    console.log('🔔 Обработка уведомления. AppState:', appState);
    console.log('🔔 Тип уведомления:', notification.request.content.data?.type);
    
    // Специальная логика для уведомлений о подарках - всегда показываем
    const notificationType = notification.request.content.data?.type;
    const isGiftNotification = notificationType === 'gift_received' || notificationType === 'friend_gift_received';
    
    if (isGiftNotification) {
      console.log('🔔 Уведомление о подарке - показываем всегда');
      
      // Воспроизводим звук уведомления
      try {
        await playNotificationSound();
      } catch (error) {
        console.error('❌ Ошибка воспроизведения звука уведомления:', error);
      }
      
      return {
        shouldShowAlert: true, // Показываем уведомления о подарках всегда
        shouldPlaySound: true, // Воспроизводим звук
        shouldSetBadge: true, // Обновляем бейдж для счетчика уведомлений
      };
    }
    
    // Для остальных уведомлений - только в фоне
    if (appState === 'active') {
      console.log('🔔 Приложение активно - не показываем push уведомление');
      return {
        shouldShowAlert: false, // Не показываем уведомления когда приложение активно
        shouldPlaySound: false, // Не воспроизводим звук
        shouldSetBadge: true, // Обновляем бейдж для счетчика уведомлений
      };
    }
    
    // Если приложение в фоне - показываем уведомления
    console.log('🔔 Приложение в фоне - показываем push уведомление');
    
    // Воспроизводим звук уведомления только в фоне
    try {
      await playNotificationSound();
    } catch (error) {
      console.error('❌ Ошибка воспроизведения звука уведомления:', error);
    }
    
    return {
      shouldShowAlert: true, // Показываем уведомления когда в фоне
      shouldPlaySound: true, // Воспроизводим звук когда в фоне
      shouldSetBadge: true, // Обновляем бейдж для счетчика уведомлений
    };
  },
});

export interface PushTokenData {
  token: string;
  user_id: string;
  device_id: string;
  platform: string;
}

/**
 * Регистрация для получения push-уведомлений
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  console.log('🔔 Начало регистрации push-уведомлений');
  console.log('🔔 Platform.OS:', Platform.OS);
  console.log('🔔 Device.isDevice:', Device.isDevice);

  if (Platform.OS === 'android') {
    // На Android нужно создать канал уведомлений
    try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HockeyStars Notifications',
      description: 'Notifications for HockeyStars app',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#fa2f40',
      sound: 'not.m4a',
      enableVibrate: true,
      enableLights: true,
    });
      console.log('🔔 Android канал уведомлений создан');
    } catch (error) {
      console.error('❌ Ошибка создания Android канала:', error);
    }
  }

  if (Device.isDevice) {
    // Проверяем разрешения
    try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('🔔 Текущий статус разрешений:', existingStatus);
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
        console.log('🔔 Запрашиваем разрешения...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
      finalStatus = status;
        console.log('🔔 Результат запроса разрешений:', status);
    }
    
    if (finalStatus !== 'granted') {
        console.error('❌ Push notifications permission denied. Status:', finalStatus);
      return null;
    }
    
      console.log('🔔 Разрешения получены, запрашиваем токен...');
    
    try {
      // Получаем Expo push token
        // Для production сборок важно использовать правильный projectId
        // Пытаемся получить projectId из конфигурации, иначе используем хардкод
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'ccb608ca-e849-4a98-b337-d38863d3ebff';
        console.log('🔔 Используемый projectId:', projectId);
        
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
      });
      
      token = expoPushToken.data;
        
        if (token) {
          console.log('✅ Push token получен успешно:', token.substring(0, 30) + '...');
          console.log('🔔 Длина токена:', token.length);
        } else {
          console.error('❌ Push token пустой');
        }
      } catch (error: any) {
      console.error('❌ Ошибка получения push token:', error);
        console.error('❌ Error details:', error?.message || 'No message');
        console.error('❌ Error code:', error?.code || 'No code');
        console.error('❌ Error stack:', error?.stack || 'No stack');
        
        // Дополнительная диагностика для production сборок
        if (error?.message?.includes('credentials') || error?.code === 'E_PUSH_NOTIFICATIONS_CREDENTIALS') {
          console.error('⚠️ ВНИМАНИЕ: Проблема с credentials для push-уведомлений!');
          console.error('⚠️ Для production сборок (TestFlight) убедитесь, что:');
          console.error('⚠️ 1. APNs credentials настроены в EAS: eas credentials');
          console.error('⚠️ 2. Production APNs ключ загружен в EAS');
          console.error('⚠️ 3. Bundle identifier совпадает: by.hockeystars.app');
        }
      }
    } catch (error: any) {
      console.error('❌ Ошибка при проверке разрешений:', error);
      console.error('❌ Error details:', error?.message || 'No message');
    }
  } else {
    console.warn('⚠️ Push notifications работают только на физических устройствах');
    console.warn('⚠️ Текущее устройство:', Device.isDevice ? 'физическое' : 'эмулятор/симулятор');
  }

  return token;
}

/**
 * Сохранение push token в базе данных
 */
export async function savePushToken(token: string, userId: string): Promise<boolean> {
  try {
    // КРИТИЧЕСКАЯ ПРОВЕРКА: userId должен быть валидным
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ [PUSH] КРИТИЧЕСКАЯ ОШИБКА: некорректный userId при сохранении токена!', userId);
      return false;
    }
    
    // Используем deviceId из Device или генерируем уникальный ID
    const deviceId = Device.osInternalBuildId || `${Platform.OS}-${Date.now()}`;
    
    const tokenData: PushTokenData = {
      token,
      user_id: userId,
      device_id: deviceId,
      platform: Platform.OS,
    };

    // ВАЖНО: Удаляем все старые токены этого пользователя для текущей платформы
    // Это предотвращает дублирование токенов от разных сборок (TestFlight, Expo Go, Production)
    try {
      const { data: deletedOldTokens, error: deleteOldError } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('platform', Platform.OS)
        .neq('token', token) // Не удаляем текущий токен, если он уже есть
        .select();
      
    } catch (deleteError) {
      // Игнорируем ошибки удаления старых токенов
    }

    // Удаляем токены с тем же значением token, но другим user_id
    try {
      const { data: deletedWrongTokens } = await supabase
        .from('push_tokens')
        .delete()
        .eq('token', token)
        .neq('user_id', userId)
        .select();
      
      if (deletedWrongTokens && deletedWrongTokens.length > 0) {
        console.log('🗑️ Удалены старые токены:', deletedWrongTokens.length);
      }
    } catch (deleteError) {
      // Игнорируем ошибки удаления
    }

    // Проверяем, существует ли уже такой токен для ЭТОГО пользователя
    const { data: existingTokens, error: selectError } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('token', token)
      .eq('user_id', userId);

    if (selectError) {
      if (selectError.code === '23503') return false;
      return false;
    }

    if (existingTokens && existingTokens.length > 0) {
      // Обновляем существующий токен
      const { error: updateError } = await supabase
        .from('push_tokens')
        .update({
          device_id: deviceId,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        })
        .eq('token', token)
        .eq('user_id', userId);

      if (updateError) {
        if (updateError.code === '23503') return false;
        return false;
      }
    } else {
      // Вставляем новый токен
      const { error: insertError } = await supabase
        .from('push_tokens')
        .insert(tokenData);

      if (insertError) {
        return false;
      }
    }

    return true;
  } catch (error: any) {
    return false;
  }
}

// Кеш для предотвращения дублирования уведомлений
const sentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5000; // 5 секунд между одинаковыми уведомлениями

/**
 * Отправка push-уведомления через Expo Push API
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  try {
    // Проверяем платформу - push-уведомления не работают в веб-версии
    if (Platform.OS === 'web') {
      console.log('🌐 Веб-версия: пропускаем push-уведомление (не поддерживается)');
      return true; // Возвращаем true, чтобы не блокировать логику
    }
    
    // Создаем уникальный ключ для проверки дублирования
    // Включаем данные в ключ для более точного определения дублирования
    const dataString = data ? JSON.stringify(data) : '';
    const notificationKey = `${token}-${title}-${body}-${dataString}`;
    const now = Date.now();
    
    // Проверяем, не отправляли ли мы такое же уведомление недавно
    if (sentNotifications.has(notificationKey)) {
      const lastSent = sentNotifications.get(notificationKey)!;
      if (now - lastSent < NOTIFICATION_COOLDOWN) {
        console.log('🔔 Пропускаем дублирующееся уведомление:', title, 'для токена:', token.substring(0, 10) + '...');
        return true; // Возвращаем true, так как уведомление уже было отправлено
      }
    }
    
    // Записываем время отправки
    sentNotifications.set(notificationKey, now);
    
    // Очищаем старые записи (старше 1 минуты)
    for (const [key, timestamp] of sentNotifications.entries()) {
      if (now - timestamp > 60000) {
        sentNotifications.delete(key);
      }
    }
    
    const message = {
      to: token,
      sound: 'not.m4a',
      title,
      body,
      data: data || {},
      // Стильные параметры для iOS
      badge: 1,
      categoryId: 'hockey_notification',
      // Параметры для Android
      android: {
        sound: 'not.m4a',
        priority: 'high',
        vibrate: [0, 250, 250, 250],
        color: '#fa2f40', // Цвет темы приложения
        icon: 'ic_notification',
        channelId: 'default',
      },
      // Параметры для iOS
      ios: {
        sound: 'not.m4a',
        badge: 1,
        categoryId: 'hockey_notification',
        critical: false,
      },
    };

    // Проверяем, что токен валидный
    if (!token || token.length < 10) {
      console.error('❌ Неверный push токен:', token);
      return false;
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(`❌ HTTP ошибка: ${response.status} ${response.statusText}`);
        return false;
      }

      const result = await response.json();
      
      if (result.data && result.data.status === 'ok') {
        return true;
      } else if (result.data && result.data.status === 'error') {
        // Обрабатываем ошибки от Expo Push API
        const errorDetails = result.data.details?.error || result.data.message;
        console.error('❌ Ошибка отправки push-уведомления:', errorDetails);
        
        // Если токен невалидный - удаляем его из БД
        if (errorDetails === 'DeviceNotRegistered' || 
            errorDetails === 'InvalidCredentials' ||
            result.data.message?.includes('is not a registered push notification recipient')) {
          console.log('🗑️ Удаляем невалидный push токен:', token.substring(0, 20) + '...');
          try {
            await supabase
              .from('push_tokens')
              .delete()
              .eq('token', token);
            console.log('✅ Невалидный токен удалён из БД');
          } catch (deleteError) {
            console.error('⚠️ Ошибка удаления невалидного токена:', deleteError);
          }
        }
        return false;
      } else {
        console.error('❌ Ошибка отправки push-уведомления:', result);
        return false;
      }
    } catch (fetchError) {
      console.error('❌ Ошибка fetch:', fetchError);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки push-уведомления:', error);
    return false;
  }
}

/**
 * Получение всех push tokens пользователя
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  try {
    // КРИТИЧЕСКАЯ ПРОВЕРКА: userId должен быть валидным
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ [PUSH] КРИТИЧЕСКАЯ ОШИБКА: некорректный userId для получения токенов:', userId);
      return [];
    }
    
    console.log('📤 [PUSH] getUserPushTokens вызван для userId:', userId);
    
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token, user_id, device_id, platform')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [PUSH] Ошибка получения push tokens:', error, 'для userId:', userId);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [PUSH] Нет токенов для userId:', userId);
      return [];
    }

    // Фильтруем токены с правильным user_id
    const validTokens = data.filter(item => item.user_id === userId);
    const tokens = validTokens.map(item => item.token).filter(Boolean);
    
    // Дедупликация токенов
    return [...new Set(tokens)];
  } catch (error) {
    console.error('❌ [PUSH] Ошибка получения push tokens:', error, 'для userId:', userId);
    return [];
  }
}

/**
 * Отправка уведомления всем устройствам пользователя
 */
export async function sendNotificationToUser(
  userId: string, 
  title: string, 
  body: string, 
  data?: any
): Promise<boolean> {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return false;
    }
    
    const tokens = await getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      return false;
    }

    const uniqueTokens = [...new Set(tokens)];
    let successCount = 0;
    
    for (let i = 0; i < uniqueTokens.length; i++) {
      const token = uniqueTokens[i];
      const success = await sendPushNotification(token, title, body, data);
      if (success) {
        successCount++;
      }
    }

    return successCount > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Специализированные функции для разных типов уведомлений
 */

/**
 * Отправка уведомления о новом сообщении
 * Push уведомления приходят только получателю сообщения
 */
export async function sendMessageNotification(
  receiverTokens: string[],
  senderName: string,
  messageText: string,
  senderId: string
): Promise<boolean> {
  const title = `💬 ${senderName}`;
  const body = messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText;
  
  // Дедупликация токенов - убираем дубликаты
  const uniqueTokens = [...new Set(receiverTokens)];
  
  const promises = uniqueTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'message',
      senderId,
      action: 'open_chat',
      deepLink: `/chat/${senderId}`
    })
  );
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

/**
 * Отправка уведомления о подарке
 */
export async function sendGiftNotification(
  receiverTokens: string[],
  senderName: string,
  giftType: string,
  senderId?: string,
  receiverId?: string
): Promise<boolean> {
  const title = `🎁 Подарок от ${senderName}`;
  const body = `Вам подарен ${giftType}! Откройте приложение, чтобы посмотреть.`;
  
  // Deep link ведёт на профиль получателя (где отображается музей с подарками)
  const deepLink = receiverId ? `/player/${receiverId}` : '/notifications';
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'gift',
      action: 'open_gifts',
      senderId,
      deepLink
    })
  );
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

/**
 * Отправка уведомления о дружбе
 */
export async function sendFriendshipNotification(
  receiverTokens: string[],
  senderName: string,
  senderId?: string
): Promise<boolean> {
  const title = `🤝 Новый друг!`;
  const body = `${senderName} принял ваш запрос в друзья`;
  
  // Deep link ведёт на профиль нового друга
  const deepLink = senderId ? `/player/${senderId}` : '/notifications';
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'friendship',
      action: 'open_friends',
      senderId,
      deepLink
    })
  );
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

/**
 * Отправка уведомления о тренировке
 */
export async function sendExerciseNotification(
  receiverTokens: string[],
  exerciseName: string
): Promise<boolean> {
  const title = `🏒 Новая тренировка!`;
  const body = `Доступна новая тренировка: ${exerciseName}`;
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'exercise',
      action: 'open_exercises'
    })
  );
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

/**
 * Отправка уведомления о достижении
 */
export async function sendAchievementNotification(
  receiverTokens: string[],
  achievementName: string,
  translations?: {
    achievementNotification: {
      title: string;
      message: string;
    };
  }
): Promise<boolean> {
  const title = translations?.achievementNotification?.title || `🏆 Достижение!`;
  const body = translations?.achievementNotification?.message?.replace('{achievementName}', achievementName) || `Поздравляем! Вы получили достижение: ${achievementName}`;
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'achievement',
      action: 'open_profile'
    })
  );
  
  const results = await Promise.all(promises);
  return results.every(result => result);
}

// Кеш для предотвращения повторной инициализации
// Используем Map для хранения времени последней инициализации
const initializedUsers = new Map<string, number>();
const INITIALIZATION_COOLDOWN = 5 * 60 * 1000; // 5 минут между попытками инициализации

/**
 * Инициализация push-уведомлений для пользователя
 */
export async function initializePushNotifications(userId: string, forceReinit: boolean = false): Promise<boolean> {
  console.log('🔔 Инициализация push-уведомлений для пользователя:', userId);
  
  // Проверяем, не инициализированы ли уже уведомления для этого пользователя
  const lastInitTime = initializedUsers.get(userId);
  const now = Date.now();
  
  if (!forceReinit && lastInitTime && (now - lastInitTime < INITIALIZATION_COOLDOWN)) {
    console.log('🔔 Push-уведомления уже инициализированы недавно, пропускаем');
    return true;
  }

  try {
    // Регистрируем для получения уведомлений
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      console.error('❌ Не удалось получить push token для пользователя:', userId);
      console.error('❌ Проверьте:');
      console.error('❌ 1. Разрешения на уведомления в настройках устройства');
      console.error('❌ 2. Для production сборок: APNs credentials в EAS');
      console.error('❌ 3. Интернет-соединение');
      return false;
    }

    console.log('🔔 Сохранение push token в базу данных...');

    // Сохраняем token в базе данных
    const saved = await savePushToken(token, userId);
    if (saved) {
      // Помечаем пользователя как инициализированного
      initializedUsers.set(userId, now);
      console.log('✅ Push-уведомления успешно инициализированы для пользователя:', userId);
      return true;
    } else {
      // Не критичная ошибка - приложение продолжит работать без push-уведомлений
      console.warn('⚠️ Не удалось сохранить push token в базу данных');
      console.warn('⚠️ Push-уведомления могут быть недоступны');
      console.warn('⚠️ Проверьте RLS политики для таблицы push_tokens в Supabase Dashboard');
      // Не возвращаем false, чтобы не блокировать работу приложения
      // Просто логируем предупреждение
      return false;
    }
  } catch (error: any) {
    // Не критичная ошибка - приложение продолжит работать без push-уведомлений
    console.warn('⚠️ Ошибка инициализации push-уведомлений:', error?.message || 'Unknown error');
    // Не логируем полный stack trace, чтобы не засорять консоль
    return false;
  }
}

/**
 * Сброс кеша инициализации для пользователя (для принудительной переинициализации)
 */
export function resetPushNotificationCache(userId?: string): void {
  if (userId) {
    initializedUsers.delete(userId);
    console.log('🔔 Кеш инициализации сброшен для пользователя:', userId);
  } else {
    initializedUsers.clear();
    console.log('🔔 Кеш инициализации полностью сброшен');
  }
}

/**
 * Удаление всех push токенов пользователя
 * Используется при выходе из аккаунта или смене пользователя
 */
export async function deleteUserPushTokens(userId: string): Promise<boolean> {
  try {
    // КРИТИЧЕСКАЯ ПРОВЕРКА: userId должен быть валидным
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ [PUSH] КРИТИЧЕСКАЯ ОШИБКА: некорректный userId для удаления токенов:', userId);
      return false;
    }
    
    console.log('🗑️ [PUSH] Удаление всех push токенов для userId:', userId);
    
    const { data: deletedTokens, error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .select();
    
    if (error) {
      console.error('❌ [PUSH] Ошибка удаления push токенов:', error, 'для userId:', userId);
      return false;
    }
    
    const deletedCount = deletedTokens?.length || 0;
    if (deletedCount > 0) {
      console.log(`✅ [PUSH] Удалено ${deletedCount} push токенов для userId: ${userId}`);
    } else {
      console.log(`ℹ️ [PUSH] Не найдено токенов для удаления для userId: ${userId}`);
    }
    
    // Также очищаем кеш инициализации
    resetPushNotificationCache(userId);
    
    return true;
  } catch (error) {
    console.error('❌ [PUSH] Ошибка удаления push токенов:', error, 'для userId:', userId);
    return false;
  }
}

