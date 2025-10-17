// Локальная версия сервиса активности (без базы данных)
// Используется когда RLS политики не настроены

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
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

// Локальное хранилище для очков активности
const localActivityPoints = new Map<string, number>();

/**
 * Добавляет очки активности пользователю (локальная версия)
 */
export async function addActivityPoints(
  userId: string, 
  activityType: ActivityType, 
  customDescription?: string
): Promise<{ success: boolean; points: number; error?: string }> {
  try {
    const activity = ACTIVITY_TYPES[activityType];
    const description = customDescription || activity.description;


    // Получаем текущие очки
    const currentPoints = localActivityPoints.get(userId) || 0;
    const newPoints = currentPoints + activity.points;
    
    // Сохраняем новые очки
    localActivityPoints.set(userId, newPoints);

    // Логируем активность
    console.log(`📊 Пользователь ${userId}: ${currentPoints} → ${newPoints} очков`);

    return { 
      success: true, 
      points: newPoints 
    };
  } catch (error) {
    console.error('Unexpected error in addActivityPoints (local):', error);
    return { 
      success: false, 
      points: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Получает очки активности пользователя (локальная версия)
 */
export async function getActivityPoints(userId: string): Promise<{ 
  success: boolean; 
  points: number; 
  error?: string 
}> {
  try {
    const points = localActivityPoints.get(userId) || 0;
    
    console.log(`📊 Получение очков для пользователя ${userId}: ${points}`);
    
    return { 
      success: true, 
      points: points 
    };
  } catch (error) {
    console.error('Unexpected error in getActivityPoints (local):', error);
    return { 
      success: false, 
      points: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Получает историю активности пользователя (локальная версия)
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
    // В локальной версии возвращаем пустой лог
    console.log(`📋 Получение лога активности для пользователя ${userId} (локальная версия)`);
    
    return { 
      success: true, 
      log: [] 
    };
  } catch (error) {
    console.error('Unexpected error in getActivityLog (local):', error);
    return { 
      success: false, 
      log: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Получает топ пользователей по активности (локальная версия)
 */
export async function getTopActiveUsers(limit: number = 10): Promise<{ 
  success: boolean; 
  users: Array<{ user_id: string; points: number; last_activity_date: string }>; 
  error?: string 
}> {
  try {
    // Конвертируем Map в массив и сортируем
    const users = Array.from(localActivityPoints.entries())
      .map(([user_id, points]) => ({
        user_id,
        points,
        last_activity_date: new Date().toISOString()
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    console.log(`🏆 Топ активных пользователей (локальная версия):`, users);
    
    return { 
      success: true, 
      users: users 
    };
  } catch (error) {
    console.error('Unexpected error in getTopActiveUsers (local):', error);
    return { 
      success: false, 
      users: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Проверяет, является ли пользователь администратором (локальная версия)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // В локальной версии всегда возвращаем false
    console.log(`👤 Проверка админ статуса для пользователя ${userId} (локальная версия)`);
    return false;
  } catch (error) {
    console.error('Error checking admin status (local):', error);
    return false;
  }
}


