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
    console.log('🔔 Сохранение push token для пользователя:', userId);
    
    // Используем deviceId из Device или генерируем уникальный ID
    const deviceId = Device.osInternalBuildId || `${Platform.OS}-${Date.now()}`;
    console.log('🔔 Device ID:', deviceId);
    
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
      // Если пользователь не найден (foreign key constraint), это нормально
      if (selectError.code === '23503') {
        console.warn('⚠️ Пользователь не найден в базе данных, пропускаем сохранение push token');
        return false;
      }
      console.warn('⚠️ Ошибка проверки существующего токена (не критично):', selectError.message);
      return false;
    }

    if (existingTokens && existingTokens.length > 0) {
      console.log('🔔 Токен уже существует, обновляем...');
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
        // Если пользователь не найден (foreign key constraint), это нормально
        if (updateError.code === '23503') {
          console.warn('⚠️ Пользователь не найден в базе данных, пропускаем обновление push token');
          return false;
        }
        console.warn('⚠️ Ошибка обновления push token (не критично):', updateError.message);
        return false;
      }
      console.log('✅ Push token обновлен');
    } else {
      console.log('🔔 Создаем новый токен...');
      // Вставляем новый токен
      const { error: insertError } = await supabase
        .from('push_tokens')
        .insert(tokenData);

      if (insertError) {
        // Ошибка foreign key constraint означает, что пользователь не существует в таблице players
        if (insertError.code === '23503') {
          console.warn('⚠️ Пользователь не найден в базе данных, пропускаем сохранение push token');
          console.warn('⚠️ Это может произойти, если пользователь еще не синхронизирован с Supabase');
          return false;
        }
        
        // Проверяем, не проблема ли это с RLS политиками
        if (insertError.code === '42501' || insertError.message?.includes('permission') || insertError.message?.includes('policy')) {
          console.warn('⚠️ Проблема с RLS политиками для push_tokens');
          console.warn('⚠️ Проверьте политики в Supabase Dashboard');
          return false;
        }
        
        // Для остальных ошибок логируем как предупреждение
        console.warn('⚠️ Ошибка вставки push token (не критично):', insertError.message);
        return false;
      }
      console.log('✅ Push token создан');
    }

    return true;
  } catch (error: any) {
    // Не критичная ошибка - приложение продолжит работать без push-уведомлений
    console.warn('⚠️ Ошибка сохранения push token (не критично):', error?.message || 'Unknown error');
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

