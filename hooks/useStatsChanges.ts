import { useState, useEffect, useCallback } from 'react';
import { Player } from '../utils/playerStorage';
import { getStatsChanges, getChangeForField as getChangeForFieldFromDB } from '../utils/playerStorage';

interface StatChange {
  field: string;
  oldValue: number;
  newValue: number;
  change: number;
  timestamp: string;
}

interface UseStatsChangesReturn {
  statsChanges: StatChange[];
  getChangeForField: (field: string) => number;
  refreshChanges: () => Promise<void>;
  isLoading: boolean;
}

export const useStatsChanges = (playerId: string): UseStatsChangesReturn => {
  const [statsChanges, setStatsChanges] = useState<StatChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем изменения из базы данных
  const loadChanges = useCallback(async () => {
    if (!playerId) {
      setStatsChanges([]);
      return;
    }

      setIsLoading(true);
    try {
      const changes = await getStatsChanges(playerId);
      setStatsChanges(changes);
    } catch (error) {
      console.error('❌ Ошибка загрузки изменений статистики:', error);
      setStatsChanges([]);
      } finally {
        setIsLoading(false);
      }
  }, [playerId]);

  // Получаем изменение для конкретного поля
  const getChangeForField = useCallback((field: string): number => {
    const change = statsChanges.find(c => c.field === field);
    return change ? change.change : 0;
  }, [statsChanges]);

  // Обновляем изменения
  const refreshChanges = useCallback(async () => {
    await loadChanges();
  }, [loadChanges]);

  // Загружаем изменения при изменении playerId
  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  return {
    statsChanges,
    getChangeForField,
    refreshChanges,
    isLoading
  };
};