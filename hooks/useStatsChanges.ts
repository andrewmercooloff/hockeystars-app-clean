import { useState, useEffect } from 'react';
import { StatChange, NormativeChange, getPlayerById } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';

interface UseStatsChangesProps {
  playerId: string;
  refreshTrigger?: number;
}

interface StatsChanges {
  statChanges: StatChange[];
  normativeChanges: NormativeChange[];
  isLoading: boolean;
  error: string | null;
}

export const useStatsChanges = ({ playerId, refreshTrigger }: UseStatsChangesProps): StatsChanges => {
  const [statChanges, setStatChanges] = useState<StatChange[]>([]);
  const [normativeChanges, setNormativeChanges] = useState<NormativeChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      console.log('❌ playerId не указан, пропускаем загрузку изменений');
      return;
    }

    // Проверяем, не загружается ли уже
    if (isLoading) {
      console.log('⏳ Загрузка уже идет, пропускаем повторный вызов');
      return;
    }

    console.log('🔄 useStatsChanges: начинаем загрузку для игрока:', playerId);
    
    // Добавляем небольшую задержку, чтобы уведомления успели сохраниться
    const timeoutId = setTimeout(() => {

    const fetchStatsChanges = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Получаем уведомления о изменениях статистики для этого игрока
        console.log('🔍 Загружаем уведомления для игрока:', playerId);
        
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', playerId)
          .eq('type', 'stats_change')
          .order('created_at', { ascending: false })
          .limit(10); // Берем последние 10 уведомлений

        if (notificationsError) {
          console.error('❌ Ошибка загрузки уведомлений о изменениях:', notificationsError);
        } else {
          console.log('📋 Найдено уведомлений:', notifications?.length || 0);
          if (notifications && notifications.length > 0) {
            console.log('📋 Первое уведомление:', JSON.stringify(notifications[0], null, 2));
            console.log('📋 Данные первого уведомления:', notifications[0].data);
          } else {
            console.log('📭 Уведомлений не найдено для игрока:', playerId);
          }
        }

        // Парсим изменения из уведомлений
        const statChanges: StatChange[] = [];
        const normativeChanges: NormativeChange[] = [];

        if (notifications && notifications.length > 0) {
          notifications.forEach(notification => {
            if (notification.data && notification.data.changes) {
              notification.data.changes.forEach((change: any) => {
                if (change.field && typeof change.change === 'number') {
                  // Определяем тип изменения по полю
                  const statsFields = ['goals', 'assists', 'games'];
                  const normativeFields = ['pullUps', 'pushUps', 'plankTime', 'sprint100m', 'longJump', 'jumpRope'];
                  
                  if (statsFields.includes(change.field)) {
                    statChanges.push({
                      field: change.field,
                      oldValue: change.oldValue || 0,
                      newValue: change.newValue || 0,
                      change: change.change,
                      timestamp: change.timestamp || notification.created_at
                    });
                  } else if (normativeFields.includes(change.field)) {
                    normativeChanges.push({
                      field: change.field,
                      oldValue: change.oldValue || 0,
                      newValue: change.newValue || 0,
                      change: change.change,
                      timestamp: change.timestamp || notification.created_at
                    });
                  }
                }
              });
            }
          });
        }

        setStatChanges(statChanges);
        setNormativeChanges(normativeChanges);
        
        console.log('📊 Загружены изменения статистики:', { 
          playerId,
          statChanges, 
          normativeChanges,
          statChangesLength: statChanges.length,
          normativeChangesLength: normativeChanges.length
        });
      } catch (err) {
        console.error('❌ Ошибка загрузки изменений статистики:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setIsLoading(false);
      }
    };

      fetchStatsChanges();
    }, 1000); // Задержка в 1 секунду

    return () => clearTimeout(timeoutId);
  }, [playerId, refreshTrigger]);

  return {
    statChanges,
    normativeChanges,
    isLoading,
    error
  };
};
