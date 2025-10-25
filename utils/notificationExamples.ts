/**
 * Примеры использования стильных push-уведомлений
 * Этот файл показывает, как использовать новые функции уведомлений
 */

import {
  getUserPushTokens,
  sendMessageNotification,
  sendGiftNotification,
  sendFriendshipNotification,
  sendExerciseNotification,
  sendAchievementNotification
} from './notificationService';

/**
 * Пример отправки уведомления о сообщении
 */
export async function exampleMessageNotification(
  receiverUserId: string,
  senderName: string,
  messageText: string,
  senderId: string
): Promise<void> {
  try {
    const tokens = await getUserPushTokens(receiverUserId);
    if (tokens.length > 0) {
      await sendMessageNotification(tokens, senderName, messageText, senderId);
      // console.log('✅ Уведомление о сообщении отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о сообщении:', error);
  }
}

/**
 * Пример отправки уведомления о подарке
 */
export async function exampleGiftNotification(
  receiverUserId: string,
  senderName: string,
  giftType: string
): Promise<void> {
  try {
    const tokens = await getUserPushTokens(receiverUserId);
    if (tokens.length > 0) {
      await sendGiftNotification(tokens, senderName, giftType);
      // console.log('✅ Уведомление о подарке отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о подарке:', error);
  }
}

/**
 * Пример отправки уведомления о дружбе
 */
export async function exampleFriendshipNotification(
  receiverUserId: string,
  senderName: string
): Promise<void> {
  try {
    const tokens = await getUserPushTokens(receiverUserId);
    if (tokens.length > 0) {
      await sendFriendshipNotification(tokens, senderName);
      // console.log('✅ Уведомление о дружбе отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о дружбе:', error);
  }
}

/**
 * Пример отправки уведомления о тренировке
 */
export async function exampleExerciseNotification(
  receiverUserId: string,
  exerciseName: string
): Promise<void> {
  try {
    const tokens = await getUserPushTokens(receiverUserId);
    if (tokens.length > 0) {
      await sendExerciseNotification(tokens, exerciseName);
      // console.log('✅ Уведомление о тренировке отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о тренировке:', error);
  }
}

/**
 * Пример отправки уведомления о достижении
 */
export async function exampleAchievementNotification(
  receiverUserId: string,
  achievementName: string
): Promise<void> {
  try {
    const tokens = await getUserPushTokens(receiverUserId);
    if (tokens.length > 0) {
      await sendAchievementNotification(tokens, achievementName);
      // console.log('✅ Уведомление о достижении отправлено');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о достижении:', error);
  }
}

/**
 * Примеры стильных заголовков и текстов уведомлений
 */
export const NOTIFICATION_EXAMPLES = {
  messages: {
    titles: [
      '💬 Новое сообщение',
      '💬 Сообщение от тренера',
      '💬 Уведомление от команды'
    ],
    bodies: [
      'У вас новое сообщение в чате!',
      'Тренер отправил вам важное сообщение',
      'Команда связывается с вами'
    ]
  },
  gifts: {
    titles: [
      '🎁 Подарок!',
      '🎁 Сюрприз от друга',
      '🎁 Новый подарок'
    ],
    bodies: [
      'Вам подарен новый предмет!',
      'Друг отправил вам подарок',
      'У вас есть новый подарок'
    ]
  },
  achievements: {
    titles: [
      '🏆 Достижение!',
      '⭐ Новый уровень!',
      '🎯 Цель достигнута!'
    ],
    bodies: [
      'Поздравляем с новым достижением!',
      'Вы достигли нового уровня!',
      'Отличная работа! Цель достигнута!'
    ]
  },
  exercises: {
    titles: [
      '🏒 Новая тренировка!',
      '💪 Тренировочный план',
      '🎯 Упражнение готово'
    ],
    bodies: [
      'Доступна новая тренировка',
      'Ваш план тренировок обновлен',
      'Новое упражнение ждет вас'
    ]
  }
};










