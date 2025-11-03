import { supabase } from './supabase';
import { createNotification, loadCurrentUser, getPlayerById } from './playerStorage';
import { getUserLanguage, loadTranslations } from './languageHelper';

export interface Like {
  id: string;
  player_id: string;
  content_id: string;
  content_type: 'video' | 'photo';
  liked_by_id: string;
  created_at: string;
}

/**
 * Генерирует уникальный идентификатор для видео
 */
export const generateVideoContentId = (url: string, timeCode?: string): string => {
  const cleanUrl = url.trim();
  const cleanTimeCode = timeCode?.trim() || '';
  return `${cleanUrl}|${cleanTimeCode}`;
};

/**
 * Генерирует идентификатор для фото (используется сам URL)
 */
export const generatePhotoContentId = (photoUrl: string): string => {
  return photoUrl.trim();
};

/**
 * Добавляет лайк к контенту
 */
export const addLike = async (
  playerId: string,
  contentId: string,
  contentType: 'video' | 'photo',
  likedById: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Проверяем, не лайкнул ли уже пользователь этот контент
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('liked_by_id', likedById)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 - "not found", это нормально, если лайка нет
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (checkError.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return { success: false, error: 'Таблица likes не создана. Выполните SQL скрипт в Supabase.' };
      }
      console.error('❌ Ошибка проверки существующего лайка:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingLike) {
      // Лайк уже существует
      return { success: false, error: 'Already liked' };
    }

    // Создаем лайк
    const { data, error } = await supabase
      .from('likes')
      .insert([
        {
          player_id: playerId,
          content_id: contentId,
          content_type: contentType,
          liked_by_id: likedById,
        },
      ])
      .select()
      .single();

    if (error) {
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (error.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return { success: false, error: 'Таблица likes не создана. Выполните SQL скрипт в Supabase.' };
      }
      console.error('❌ Ошибка добавления лайка:', error);
      return { success: false, error: error.message };
    }

    // Отправляем уведомление автору контента (если это не он сам)
    if (playerId !== likedById) {
      await notifyAboutLike(playerId, contentId, contentType, likedById);
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Ошибка при добавлении лайка:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Удаляет лайк
 */
export const removeLike = async (
  contentId: string,
  contentType: 'video' | 'photo',
  likedById: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('liked_by_id', likedById);

    if (error) {
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (error.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return { success: false, error: 'Таблица likes не создана. Выполните SQL скрипт в Supabase.' };
      }
      console.error('❌ Ошибка удаления лайка:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Ошибка при удалении лайка:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Получает все лайки для контента
 */
export const getLikesForContent = async (
  contentId: string,
  contentType: 'video' | 'photo'
): Promise<Like[]> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false });

    if (error) {
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (error.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return [];
      }
      console.error('❌ Ошибка получения лайков:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка при получении лайков:', error);
    return [];
  }
};

/**
 * Получает все лайки для массива контентов
 */
export const getLikesForMultipleContent = async (
  contentIds: string[],
  contentType: 'video' | 'photo'
): Promise<Map<string, Like[]>> => {
  try {
    if (contentIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('content_type', contentType)
      .in('content_id', contentIds)
      .order('created_at', { ascending: false });

    if (error) {
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (error.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return new Map();
      }
      console.error('❌ Ошибка получения лайков:', error);
      return new Map();
    }

    // Группируем лайки по content_id
    const likesMap = new Map<string, Like[]>();
    (data || []).forEach((like) => {
      const existing = likesMap.get(like.content_id) || [];
      existing.push(like);
      likesMap.set(like.content_id, existing);
    });

    return likesMap;
  } catch (error) {
    console.error('❌ Ошибка при получении лайков:', error);
    return new Map();
  }
};

/**
 * Проверяет, лайкнул ли пользователь контент
 */
export const checkIfLiked = async (
  contentId: string,
  contentType: 'video' | 'photo',
  userId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('liked_by_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // 42P01 - таблица не существует (нужно выполнить SQL скрипт)
      if (error.code === '42P01') {
        console.warn('⚠️ Таблица likes не существует. Выполните SQL скрипт database/create_likes_table.sql в Supabase.');
        return false;
      }
      console.error('❌ Ошибка проверки лайка:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('❌ Ошибка при проверке лайка:', error);
    return false;
  }
};

/**
 * Отправляет уведомление автору контента о лайке
 */
const notifyAboutLike = async (
  playerId: string,
  contentId: string,
  contentType: 'video' | 'photo',
  likedById: string
): Promise<void> => {
  try {
    // Получаем данные пользователя, который лайкнул
    const likedByUser = await getPlayerById(likedById);
    if (!likedByUser) {
      console.error('❌ Пользователь, лайкнувший контент, не найден');
      return;
    }

    // Получаем язык получателя уведомления
    const recipientLanguage = await getUserLanguage(playerId);
    const translations = await loadTranslations(recipientLanguage);

    // Определяем тип уведомления
    const notificationType = contentType === 'video' ? 'video_liked' : 'photo_liked';
    
    // Получаем текст уведомления
    const titleKey = `notifications.${notificationType}.title`;
    const messageKey = `notifications.${notificationType}.message`;
    
    const title = translations?.notifications?.[notificationType]?.title || 
                  (contentType === 'video' ? 'Ваше видео лайкнули' : 'Ваше фото лайкнули');
    const message = translations?.notifications?.[notificationType]?.message?.replace('{name}', likedByUser.name) ||
                    `${likedByUser.name} ${contentType === 'video' ? 'лайкнул ваше видео' : 'лайкнул ваше фото'}`;

    // Push уведомление
    const pushTitle = title;
    const pushBody = message;

    // Создаем уведомление
    await createNotification({
      user_id: playerId,
      type: notificationType,
      title: pushTitle,
      message: pushBody,
      data: {
        contentId,
        contentType,
        likedByUserId: likedById,
        likedByName: likedByUser.name,
        likedByAvatar: likedByUser.avatar,
        playerId,
      },
    });

    // Обновляем счетчик уведомлений
    try {
      // Получаем текущий счетчик из БД
      const { data: playerData, error: fetchError } = await supabase
        .from('players')
        .select('notifications, unread_notifications_count')
        .eq('id', playerId)
        .single();

      if (fetchError) {
        console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
      } else {
        let currentCount = 0;
        try {
          // Пробуем получить из unread_notifications_count
          if (playerData?.unread_notifications_count !== undefined && playerData?.unread_notifications_count !== null) {
            currentCount = playerData.unread_notifications_count;
          } else {
            // Fallback на JSON поле notifications
            const notifData = playerData?.notifications;
            if (typeof notifData === 'string') {
              const parsed = JSON.parse(notifData);
              currentCount = parsed.unread_count || 0;
            } else if (typeof notifData === 'object' && notifData !== null) {
              currentCount = notifData.unread_count || 0;
            }
          }
        } catch (parseError) {
          console.error('❌ Ошибка парсинга notifications:', parseError);
          currentCount = 0;
        }

        const newCount = currentCount + 1;

        // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
        const { error: updateError } = await supabase
          .from('players')
          .update({ 
            unread_notifications_count: newCount,
            notifications: JSON.stringify({
              unread_count: newCount,
              last_updated: new Date().toISOString()
            })
          })
          .eq('id', playerId);

        if (updateError) {
          console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
        } else {
          console.log(`✅ Счетчик уведомлений обновлен для пользователя ${playerId}: ${currentCount} → ${newCount}`);
        }
      }
    } catch (updateError) {
      console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
    }

    // Отправляем push-уведомление только владельцу контента
    try {
      const { getUserPushTokens, sendPushNotification } = await import('./notificationService');
      console.log(`📱 Отправка push-уведомления о лайке получателю: ${playerId}`);
      const tokens = await getUserPushTokens(playerId);
      console.log(`📱 Найдено ${tokens.length} токен(ов) для получателя ${playerId}`);
      
      if (tokens.length > 0) {
        for (const token of tokens) {
          await sendPushNotification(token, pushTitle, pushBody, {
            type: notificationType,
            contentId,
            contentType,
            likedByUserId: likedById,
            likedByName: likedByUser.name,
            likedByAvatar: likedByUser.avatar,
            playerId,
          });
          console.log(`✅ Push-уведомление о лайке отправлено на токен для пользователя ${playerId}`);
        }
      } else {
        console.log(`⚠️ У пользователя ${playerId} нет зарегистрированных push-токенов`);
      }
    } catch (pushError) {
      console.error('❌ Ошибка отправки push-уведомления о лайке:', pushError);
    }

    console.log(`✅ Уведомление о лайке отправлено пользователю ${playerId}`);
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о лайке:', error);
  }
};

