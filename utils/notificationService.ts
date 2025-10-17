import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { playNotificationSound } from './soundService';

// Настройка обработчика уведомлений
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Когда приложение активно (в фокусе) - не показываем push уведомления
    // Они будут показаны только когда приложение в фоне или закрыто
    
    return {
      shouldShowAlert: false, // Не показываем уведомления когда приложение активно
      shouldPlaySound: false, // Не воспроизводим звук
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
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#fa2f40',
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
      console.log('❌ Push notifications permission denied');
      return null;
    }
    
    try {
      // Получаем Expo push token
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'ccb608ca-e849-4a98-b337-d38863d3ebff', // Ваш EAS project ID
      });
      
      token = expoPushToken.data;
      console.log('✅ Push token получен:', token);
    } catch (error) {
      console.error('❌ Ошибка получения push token:', error);
    }
  } else {
    console.log('❌ Push notifications работают только на физических устройствах');
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

    console.log('✅ Push token сохранен в базе данных');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения push token:', error);
    return false;
  }
}

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
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      // Стильные параметры для iOS
      badge: 1,
      categoryId: 'hockey_notification',
      // Параметры для Android
      android: {
        sound: 'default',
        priority: 'high',
        vibrate: [0, 250, 250, 250],
        color: '#fa2f40', // Цвет темы приложения
        icon: 'ic_notification',
        channelId: 'hockey_messages',
      },
      // Параметры для iOS
      ios: {
        sound: 'default',
        badge: 1,
        categoryId: 'hockey_notification',
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

    return data?.map(item => item.token) || [];
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
      console.log('❌ У пользователя нет зарегистрированных устройств');
      return false;
    }

    let successCount = 0;
    
    // Отправляем на все устройства пользователя
    for (const token of tokens) {
      const success = await sendPushNotification(token, title, body, data);
      if (success) successCount++;
    }

    console.log(`✅ Уведомления отправлены на ${successCount}/${tokens.length} устройств`);
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
  
  const promises = receiverTokens.map(token => 
    sendPushNotification(token, title, body, {
      type: 'message',
      senderId,
      action: 'open_chat'
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
      action: 'open_gifts'
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
      action: 'open_friends'
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

/**
 * Инициализация push-уведомлений для пользователя
 */
export async function initializePushNotifications(userId: string): Promise<boolean> {
  try {
    console.log('🚀 Инициализация push-уведомлений...');
    
    // Регистрируем для получения уведомлений
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      console.log('❌ Не удалось получить push token');
      return false;
    }

    // Сохраняем token в базе данных
    const saved = await savePushToken(token, userId);
    
    if (saved) {
      console.log('✅ Push-уведомления успешно инициализированы');
      return true;
    } else {
      console.log('❌ Не удалось сохранить push token');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации push-уведомлений:', error);
    return false;
  }
}

