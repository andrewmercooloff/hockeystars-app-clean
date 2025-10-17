import { useEffect, useCallback } from 'react';
import { addActivityPoints, ActivityType } from '../services/activityService';

/**
 * Хук для автоматического отслеживания активности пользователя
 * @param userId - ID пользователя
 * @param enabled - Включено ли отслеживание (по умолчанию true)
 */
export function useActivityTracking(userId?: string, enabled: boolean = true) {
  /**
   * Трекает активность пользователя
   */
  const trackActivity = useCallback(async (
    activityType: ActivityType,
    customDescription?: string
  ) => {
    if (!enabled || !userId) {
      return;
    }

    try {
      const result = await addActivityPoints(userId, activityType, customDescription);
      
      if (result.success) {
      } else {
        console.error(`❌ Failed to track activity: ${activityType}`, result.error);
      }
    } catch (error) {
      console.error('❌ Unexpected error tracking activity:', error);
    }
  }, [userId, enabled]);

  return { trackActivity };
}
