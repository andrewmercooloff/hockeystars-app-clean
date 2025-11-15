import { useState, useEffect, useCallback } from 'react';
import { ExerciseService } from '../services/exerciseService';
import { 
  Exercise, 
  LocalizedExercise, 
  Language, 
  ExerciseFilters,
  ExerciseStats 
} from '../types/exercise';
import { dataCache, CACHE_KEYS } from '../utils/DataCache';

export interface UseExercisesReturn {
  exercises: LocalizedExercise[];
  loading: boolean;
  error: string | null;
  categories: string[];
  difficulties: string[];
  refreshExercises: () => Promise<void>;
  getExerciseById: (exerciseId: string) => Promise<LocalizedExercise | null>;
  markAsCompleted: (exerciseId: string) => Promise<void>;
  userStats: { [exerciseId: string]: number };
  exerciseRankings: { [exerciseId: string]: number };
}

export function useExercises(
  language: Language = 'ru',
  filters?: ExerciseFilters
): UseExercisesReturn {
  const [exercises, setExercises] = useState<LocalizedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<{ [exerciseId: string]: number }>({});
  const [exerciseRankings, setExerciseRankings] = useState<{ [exerciseId: string]: number }>({});

  // Загружаем упражнения с кешированием
  const loadExercises = useCallback(async () => {
    try {
      setError(null);

      // Оптимизация: сначала пытаемся получить кешированные данные синхронно
      const cacheKey = `${CACHE_KEYS.EXERCISES}_${language}`;
      const cachedExercises = await dataCache.get(cacheKey);
      
      if (cachedExercises && cachedExercises.length > 0) {
        // Показываем кешированные данные сразу
        setExercises(cachedExercises);
        setLoading(false); // Убираем индикатор загрузки для кешированных данных
      } else {
        setLoading(true);
      }

      // Используем кеширование для всех данных (обновляем в фоне)
      const [exercisesData, categoriesData, difficultiesData, rankingsData] = await Promise.all([
        dataCache.getOrLoad(
          `${CACHE_KEYS.EXERCISES}_${language}`,
          () => ExerciseService.getLocalizedExercises(language, filters),
          10 * 60 * 1000 // 10 минут
        ),
        dataCache.getOrLoad(
          `${CACHE_KEYS.EXERCISE_CATEGORIES}_${language}`,
          () => ExerciseService.getExerciseCategories(language),
          30 * 60 * 1000 // 30 минут
        ),
        dataCache.getOrLoad(
          `${CACHE_KEYS.EXERCISE_DIFFICULTIES}_${language}`,
          () => ExerciseService.getExerciseDifficulties(language),
          30 * 60 * 1000 // 30 минут
        ),
        dataCache.getOrLoad(
          CACHE_KEYS.EXERCISE_RANKINGS,
          () => ExerciseService.getExerciseRankings(),
          5 * 60 * 1000 // 5 минут
        )
      ]);

      setExercises(exercisesData);
      setCategories(categoriesData);
      setDifficulties(difficultiesData);
      setExerciseRankings(rankingsData);
    } catch (err) {
      console.error('❌ Ошибка загрузки упражнений:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [language, filters]);

  // Загружаем статистику пользователя с кешированием
  const loadUserStats = useCallback(async () => {
    try {
      // Импортируем функцию загрузки текущего пользователя
      const { loadCurrentUser } = await import('../utils/playerStorage');
      const user = await loadCurrentUser();
      
      if (user && user.id) {
        const stats = await dataCache.getOrLoad(
          `${CACHE_KEYS.USER_STATS}_${user.id}`,
          () => ExerciseService.getUserExerciseStats(user.id),
          2 * 60 * 1000 // 2 минуты
        );
        setUserStats(stats);
      } else {
        setUserStats({});
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
      setUserStats({});
    }
  }, []);

  // Получаем упражнение по ID
  const getExerciseById = useCallback(async (exerciseId: string): Promise<LocalizedExercise | null> => {
    try {
      return await ExerciseService.getLocalizedExerciseById(exerciseId, language);
    } catch (err) {
      console.error('Error getting exercise by ID:', err);
      return null;
    }
  }, [language]);

  // Отмечаем упражнение как выполненное
  const markAsCompleted = useCallback(async (exerciseId: string) => {
    try {
      console.warn('💪 [USE-EXERCISES] markAsCompleted вызван для exerciseId:', exerciseId);
      // Импортируем функцию загрузки текущего пользователя
      const { loadCurrentUser } = await import('../utils/playerStorage');
      console.warn('💪 [USE-EXERCISES] Загружаем текущего пользователя...');
      const user = await loadCurrentUser();
      console.error('💪 [USE-EXERCISES] Пользователь загружен:', user ? { id: user.id, name: user.name } : 'null');
      
      if (user && user.id) {
        console.warn('💪 [USE-EXERCISES] Вызываем ExerciseService.markExerciseAsCompleted...');
        await ExerciseService.markExerciseAsCompleted(user.id, exerciseId);
        console.warn('✅ [USE-EXERCISES] ExerciseService.markExerciseAsCompleted завершен');
        
        // КРИТИЧНО: Инвалидируем кеш профиля пользователя!
        // Это обновит раздел "выполненные упражнения" в профиле
        await dataCache.invalidate(CACHE_KEYS.USER_PROFILE);
        
        // Инвалидируем кеш статистики пользователя
        await dataCache.invalidate(`${CACHE_KEYS.USER_STATS}_${user.id}`);
        
        // Инвалидируем кеш рейтинга упражнений
        await dataCache.invalidate(CACHE_KEYS.EXERCISE_RANKINGS);
        
        // Очищаем глобальный кеш пользователя
        try {
          const playerStorage = await import('../utils/playerStorage');
          if (playerStorage.globalUserCache) {
            console.log('🔍 Очищаем глобальный кеш пользователя');
            playerStorage.globalUserCache = null;
          }
        } catch (cacheError) {
          console.warn('⚠️ Не удалось очистить глобальный кеш:', cacheError);
        }
        
        // Обновляем локальную статистику
        setUserStats(prev => {
          const newStats = {
            ...prev,
            [exerciseId]: (prev[exerciseId] || 0) + 1
          };
          return newStats;
        });
        
        // Обновляем локальный рейтинг упражнений
        setExerciseRankings(prev => {
          const newRankings = {
            ...prev,
            [exerciseId]: (prev[exerciseId] || 0) + 1
          };
          return newRankings;
        });
        
        // Принудительно обновляем данные пользователя в UserContext
        // НЕ вызываем loadCurrentUser здесь - это сделает UserContext при следующем обращении
        console.log('✅ [USE-EXERCISES] Все кеши очищены - профиль обновится автоматически');
        
      } else {
        console.warn('⚠️ [USE-EXERCISES] Пользователь не найден или нет ID');
      }
    } catch (err) {
      console.error('❌ Error marking exercise as completed:', err);
      throw err;
    }
  }, []);

  // Обновляем упражнения
  const refreshExercises = useCallback(async () => {
    await loadExercises();
  }, [loadExercises]);

  // Загружаем данные при монтировании и изменении языка
  useEffect(() => {
    loadExercises();
    loadUserStats();
  }, [language]); // Убираем фильтры из зависимостей

  return {
    exercises,
    loading,
    error,
    categories,
    difficulties,
    refreshExercises,
    getExerciseById,
    markAsCompleted,
    userStats,
    exerciseRankings
  };
}

// Хук для работы с одним упражнением
export function useExercise(exerciseId: string, language: Language = 'ru') {
  const [exercise, setExercise] = useState<LocalizedExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExercise = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const exerciseData = await ExerciseService.getLocalizedExerciseById(exerciseId, language);
      setExercise(exerciseData);
    } catch (err) {
      console.error('Error loading exercise:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  }, [exerciseId, language]);

  useEffect(() => {
    if (exerciseId) {
      loadExercise();
    }
  }, [loadExercise]);

  return {
    exercise,
    loading,
    error,
    refresh: loadExercise
  };
}

// Хук для статистики упражнений пользователя
export function useExerciseStats(userId?: string) {
  const [stats, setStats] = useState<{ [exerciseId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!userId) {
      setStats({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userStats = await ExerciseService.getUserExerciseStats(userId);
      setStats(userStats);
    } catch (err) {
      console.error('Error loading exercise stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exercise stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsCompleted = useCallback(async (exerciseId: string) => {
    if (!userId) return;

    try {
      await ExerciseService.markExerciseAsCompleted(userId, exerciseId);
      
      // Обновляем локальную статистику
      setStats(prev => ({
        ...prev,
        [exerciseId]: (prev[exerciseId] || 0) + 1
      }));
    } catch (err) {
      console.error('Error marking exercise as completed:', err);
      throw err;
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    markAsCompleted,
    refresh: loadStats
  };
}