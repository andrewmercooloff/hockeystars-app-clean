import { supabase } from '../utils/supabase';

export interface ActivityLogEntry {
  id: number;
  user_id: string;
  activity_type: string;
  points_earned: number;
  description?: string;
  created_at: string;
}

export interface ActivityPoints {
  id: number;
  user_id: string;
  points: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

// Типы активности с соответствующими очками
export const ACTIVITY_TYPES = {
  LOGIN: { type: 'login', points: 1, description: 'Вход в приложение' },
  EXERCISE_COMPLETE: { type: 'exercise_complete', points: 1, description: 'Выполнение упражнения' },
  EXERCISE_VIEW: { type: 'exercise_view', points: 1, description: 'Просмотр упражнения' },
  PROFILE_UPDATE: { type: 'profile_update', points: 1, description: 'Обновление профиля' },
  STATS_UPDATE: { type: 'stats_update', points: 1, description: 'Изменение статистики' },
  FRIEND_ADD: { type: 'friend_add', points: 1, description: 'Добавление в друзья' },
  MESSAGE_SEND: { type: 'message_send', points: 1, description: 'Отправка сообщения' },
  PHOTO_UPLOAD: { type: 'photo_upload', points: 1, description: 'Загрузка фото' },
  VIDEO_UPLOAD: { type: 'video_upload', points: 1, description: 'Загрузка видео' },
  PROFILE_FILL: { type: 'profile_fill', points: 1, description: 'Заполнение профиля' },
  PUCK_SPEED_SAVE: { type: 'puck_speed_save', points: 5, description: 'Сохранение скорости шайбы в профиль' },
  REGISTRATION: { type: 'registration', points: 50, description: 'Регистрация профиля' },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

/**
 * Создает новую запись активности (вспомогательная функция)
 */
async function createNewActivityPoints(userId: string, points: number): Promise<{ success: boolean; points: number; error?: string }> {
  try {
    const { error: insertError } = await supabase
      .from('activity_points')
      .insert({
        user_id: userId,
        points: points,
        last_activity_date: new Date().toISOString()
      });

    if (insertError) {
      // Игнорируем RLS ошибки (не выводим в консоль)
      if (insertError.code === '42501') {
        return { success: true, points: points }; // Возвращаем успех даже при RLS ошибке
      } else {
        console.error('Error inserting activity points:', insertError);
        return { success: false, points: 0, error: insertError.message };
      }
    }

    return { 
      success: true, 
      points: points 
    };
  } catch (error) {
    console.error('Unexpected error in createNewActivityPoints:', error);
    return { 
      success: true, // Возвращаем успех даже при ошибке
      points: points 
    };
  }
}

/**
 * Начисляет 50 очков за регистрацию, если ещё не начисляли (дети после parental consent).
 */
export async function ensureRegistrationActivityPoints(
  userId: string,
  playerName?: string
): Promise<{ success: boolean; awarded: boolean }> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('activity_log')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', ACTIVITY_TYPES.REGISTRATION.type)
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code === '42501') {
        return { success: true, awarded: false };
      }
      console.error('Error checking registration activity:', checkError);
      return { success: false, awarded: false };
    }

    if (existing) {
      return { success: true, awarded: false };
    }

    const result = await addActivityPoints(
      userId,
      'REGISTRATION',
      playerName ? `Регистрация профиля: ${playerName}` : undefined
    );
    return { success: result.success, awarded: result.success };
  } catch (error) {
    console.error('Unexpected error in ensureRegistrationActivityPoints:', error);
    return { success: false, awarded: false };
  }
}

/**
 * Добавляет очки активности пользователю
 */
export async function addActivityPoints(
  userId: string, 
  activityType: ActivityType, 
  customDescription?: string
): Promise<{ success: boolean; points: number; error?: string }> {
  try {
    const activity = ACTIVITY_TYPES[activityType];
    const description = customDescription || activity.description;

    // Добавляем запись в лог активности (игнорируем RLS ошибки)
    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        activity_type: activity.type,
        points_earned: activity.points,
        description: description
      });

    if (logError) {
      // Игнорируем RLS ошибки (не выводим в консоль)
      if (logError.code !== '42501') {
        console.error('Error adding activity log:', logError);
        return { success: false, points: 0, error: logError.message };
      }
    }

    // Обновляем или создаем запись с общими очками
    const { data: existingPoints, error: fetchError } = await supabase
      .from('activity_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      // Игнорируем RLS ошибки (не выводим в консоль)
      if (fetchError.code === '42501') {
        // Создаем новую запись
        return await createNewActivityPoints(userId, activity.points);
      } else {
        console.error('Error fetching activity points:', fetchError);
        return { success: false, points: 0, error: fetchError.message };
      }
    }

    if (existingPoints) {
      // Обновляем существующую запись
      const newPoints = existingPoints.points + activity.points;
      const { error: updateError } = await supabase
        .from('activity_points')
        .update({
          points: newPoints,
          last_activity_date: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        // Игнорируем RLS ошибки (не выводим в консоль)
        if (updateError.code === '42501') {
          return { success: true, points: newPoints };
        } else {
          console.error('Error updating activity points:', updateError);
          return { success: false, points: 0, error: updateError.message };
        }
      }

      return { 
        success: true, 
        points: newPoints 
      };
    } else {
      // Создаем новую запись
      const { error: insertError } = await supabase
        .from('activity_points')
        .insert({
          user_id: userId,
          points: activity.points,
          last_activity_date: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting activity points:', insertError);
        return { success: false, points: 0, error: insertError.message };
      }

      return { 
        success: true, 
        points: activity.points 
      };
    }
  } catch (error) {
    console.error('Unexpected error in addActivityPoints:', error);
    return { 
      success: false, 
      points: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export type PlayerWithActivityRating = {
  id: string;
  activityRating?: number | null;
};

/** Проставить activityRating на список игроков (поиск, лёд) */
export async function applyActivityRatingsToPlayers<T extends PlayerWithActivityRating>(
  players: T[],
): Promise<T[]> {
  if (players.length === 0) return players;
  try {
    const activityRatings = await getPlayersActivityRatings(players.map((p) => p.id));
    if (Object.keys(activityRatings).length > 0) {
      players.forEach((player) => {
        if (activityRatings[player.id] !== undefined) {
          player.activityRating = activityRatings[player.id];
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ Не удалось применить рейтинги активности:', error);
  }
  return players;
}

/**
 * Получить рейтинги активности для списка игроков
 */
export async function getPlayersActivityRatings(playerIds: string[]): Promise<{ [playerId: string]: number }> {
  try {
    if (playerIds.length === 0) return {};

    const ratings: { [playerId: string]: number } = {};
    // Keep URL/query headers small for the Timeweb nginx proxy.
    // Large `.in()` lists previously triggered "upstream sent too big header" -> 502.
    const BATCH_SIZE = 50;

    for (let offset = 0; offset < playerIds.length; offset += BATCH_SIZE) {
      const batch = playerIds.slice(offset, offset + BATCH_SIZE);
      const { data, error } = await supabase
        .from('activity_points')
        .select('user_id, points')
        .in('user_id', batch);

      if (error) {
        console.error('Ошибка загрузки рейтингов активности (batch):', error);
        continue;
      }

      data?.forEach(entry => {
        ratings[entry.user_id] = entry.points || 0;
      });
    }

    return ratings;
  } catch (error) {
    console.error('Ошибка загрузки рейтингов активности:', error);
    return {};
  }
}

/**
 * Получает очки активности пользователя
 */
export async function getActivityPoints(userId: string): Promise<{ 
  success: boolean; 
  points: number; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('activity_points')
      .select('points')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: true, points: 0 };
      }
      // Игнорируем RLS ошибки (не выводим в консоль)
      if (error.code === '42501') {
        return { success: true, points: 0 };
      }
      console.error('Error fetching activity points:', error);
      return { success: false, points: 0, error: error.message };
    }

    return { 
      success: true, 
      points: data?.points || 0 
    };
  } catch (error) {
    console.error('Unexpected error in getActivityPoints:', error);
    return { 
      success: false, 
      points: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Получает историю активности пользователя
 */
export async function getActivityLog(
  userId: string, 
  limit: number = 50
): Promise<{ 
  success: boolean; 
  log: ActivityLogEntry[]; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity log:', error);
      return { success: false, log: [], error: error.message };
    }

    return { 
      success: true, 
      log: data || [] 
    };
  } catch (error) {
    console.error('Unexpected error in getActivityLog:', error);
    return { 
      success: false, 
      log: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Получает топ пользователей по активности (только для админов)
 */
export async function getTopActiveUsers(limit: number = 10): Promise<{ 
  success: boolean; 
  users: Array<{ user_id: string; points: number; last_activity_date: string }>; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('activity_points')
      .select('user_id, points, last_activity_date')
      .order('points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top active users:', error);
      return { success: false, users: [], error: error.message };
    }

    return { 
      success: true, 
      users: data || [] 
    };
  } catch (error) {
    console.error('Unexpected error in getTopActiveUsers:', error);
    return { 
      success: false, 
      users: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Проверяет, является ли пользователь администратором
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
