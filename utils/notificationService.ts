import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
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

  if (Platform.OS === 'android') {
    // На Android нужно создать канал уведомлений
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
  }

  if (Device.isDevice) {
    // Проверяем разрешения
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      // console.log('❌ Push notifications permission denied. Status:', finalStatus);
      return null;
    }
    
    
    try {
      // Получаем Expo push token
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'ccb608ca-e849-4a98-b337-d38863d3ebff', // Ваш EAS project ID
      });
      
      token = expoPushToken.data;
    } catch (error) {
      console.error('❌ Ошибка получения push token:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  } else {
    // console.log('❌ Push notifications работают только на физических устройствах');
  }

  return token;
}

/**
 * Сохранение push token в базе данных
 */
export async function savePushToken(token: string, userId: string): Promise<boolean> {
  try {
    // Используем deviceId из Device или генерируем уникальный ID
    const deviceId = Device.osInternalBuildId || `${Platform.OS}-${Date.now()}`;
    
    const tokenData: PushTokenData = {
      token,
      user_id: userId,
      device_id: deviceId,
      platform: Platform.OS,
    };

    // Проверяем, существует ли уже такой токен для этого пользователя
    const { data: existingTokens, error: selectError } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('token', token)
      .eq('user_id', userId);

    if (selectError) {
      console.error('❌ Ошибка проверки существующего токена:', selectError);
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
        console.error('❌ Ошибка обновления push token:', updateError);
        return false;
      }
    } else {
      // Вставляем новый токен
      const { error: insertError } = await supabase
        .from('push_tokens')
        .insert(tokenData);

      if (insertError) {
        console.error('❌ Ошибка вставки push token:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения push token:', error);
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
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Ошибка получения push tokens:', error);
      return [];
    }

    const tokens = data?.map(item => item.token) || [];
    
    // Дедупликация токенов на уровне базы данных
    const uniqueTokens = [...new Set(tokens)];
    
    if (tokens.length !== uniqueTokens.length) {
      console.log(`⚠️ PUSH: Найдены дублирующиеся токены для пользователя ${userId}`);
      console.log(`⚠️ PUSH: Токенов до дедупликации: ${tokens.length}`);
      console.log(`⚠️ PUSH: Токенов после дедупликации: ${uniqueTokens.length}`);
    }
    
    return uniqueTokens;
  } catch (error) {
    console.error('❌ Ошибка получения push tokens:', error);
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
    const tokens = await getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      // console.log('❌ У пользователя нет зарегистрированных устройств');
      return false;
    }

    // Дедупликация токенов - убираем дубликаты
    const uniqueTokens = [...new Set(tokens)];
    
    if (uniqueTokens.length !== tokens.length) {
      console.log(`🔧 Дедупликация токенов: ${tokens.length} → ${uniqueTokens.length} уникальных токенов`);
    }

    let successCount = 0;
    
    // Отправляем на все уникальные устройства пользователя
    for (const token of uniqueTokens) {
      const success = await sendPushNotification(token, title, body, data);
      if (success) successCount++;
    }

    // console.log(`✅ Уведомления отправлены на ${successCount}/${uniqueTokens.length} устройств для пользователя ${userId}`);
    return successCount > 0;
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления пользователю:', error);
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
  giftType: string
): Promise<boolean> {
  const title = `🎁 Подарок от ${senderName}`;
  const body = `Вам подарен ${giftType}! Откройте приложение, чтобы посмотреть.`;
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'gift',
      action: 'open_gifts',
      deepLink: '/gifts'
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
  senderName: string
): Promise<boolean> {
  const title = `🤝 Новый друг!`;
  const body = `${senderName} принял ваш запрос в друзья`;
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'friendship',
      action: 'open_friends',
      deepLink: '/friends'
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
const initializedUsers = new Set<string>();

/**
 * Инициализация push-уведомлений для пользователя
 */
export async function initializePushNotifications(userId: string): Promise<boolean> {
  // Проверяем, не инициализированы ли уже уведомления для этого пользователя
  if (initializedUsers.has(userId)) {
    return true;
  }

  try {
    // Регистрируем для получения уведомлений
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      // console.log('❌ Не удалось получить push token');
      return false;
    }

    // Сохраняем token в базе данных
    const saved = await savePushToken(token, userId);
    if (saved) {
      // Помечаем пользователя как инициализированного
      initializedUsers.add(userId);
      return true;
    } else {
      // console.log('❌ Не удалось сохранить push token');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации push-уведомлений:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    return false;
  }
}

