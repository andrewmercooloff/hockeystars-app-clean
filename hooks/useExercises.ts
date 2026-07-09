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

interface UseExercisesOptions {
  enabled?: boolean;
}

export function useExercises(
  language: Language = 'ru',
  filters?: ExerciseFilters,
  options: UseExercisesOptions = {}
): UseExercisesReturn {
  const [exercises, setExercises] = useState<LocalizedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<{ [exerciseId: string]: number }>({});
  const [exerciseRankings, setExerciseRankings] = useState<{ [exerciseId: string]: number }>({});
  const isEnabled = options.enabled ?? true;

  // Загружаем упражнения с кешированием
  const loadExercises = useCallback(async () => {
    // Не загружаем, если язык не установлен или загрузка отключена
    if (!language || !isEnabled) {
      if (!isEnabled) {
        console.log('⏸ Загрузка упражнений приостановлена до готовности языка');
      } else {
      console.log('⏳ Ожидание загрузки языка...');
      }
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // ВАЖНО: Всегда загружаем данные для текущего языка напрямую, без кеша
      // Это гарантирует, что при смене языка данные будут правильными
      console.log(`🔄 Загрузка упражнений для языка: ${language}`);
      // Важно: один сетевой запрос вместо трех параллельных. На VPS-прокси
      // один upstream blip раньше валил весь экран упражнений с 502.
      const exercisesData = await ExerciseService.getLocalizedExercises(language, filters);
      const categoriesData = Array.from(
        new Set(exercisesData.map((exercise) => exercise.category).filter(Boolean))
      ).sort();
      const difficultiesData = Array.from(
        new Set(exercisesData.map((exercise) => exercise.difficulty).filter(Boolean))
      ).sort();

      // Сохраняем в кеш для будущего использования
      const cacheKey = `${CACHE_KEYS.EXERCISES}_${language}`;
      const EXERCISES_CACHE_MS = 24 * 60 * 60 * 1000;
      await dataCache.set(cacheKey, exercisesData, EXERCISES_CACHE_MS);
      await dataCache.set(`${CACHE_KEYS.EXERCISE_CATEGORIES}_${language}`, categoriesData, EXERCISES_CACHE_MS);
      await dataCache.set(`${CACHE_KEYS.EXERCISE_DIFFICULTIES}_${language}`, difficultiesData, EXERCISES_CACHE_MS);

      setExercises(exercisesData);
      setCategories(categoriesData);
      setDifficulties(difficultiesData);

      // Рейтинги (тяжёлый запрос) — в фоне, после показа экрана
      void dataCache.getOrLoad(
        CACHE_KEYS.EXERCISE_RANKINGS,
        () => ExerciseService.getExerciseRankings(),
        5 * 60 * 1000
      ).then((rankingsData) => {
        setExerciseRankings(rankingsData);
      }).catch((rankErr) => {
        console.warn('⚠️ Рейтинги упражнений недоступны (не критично):', rankErr?.message);
      });
    } catch (err) {
      console.error('❌ Ошибка загрузки упражнений:', err);
      const cacheKey = `${CACHE_KEYS.EXERCISES}_${language}`;
      const cachedExercises = await dataCache.get<LocalizedExercise[]>(cacheKey);
      if (cachedExercises && cachedExercises.length > 0) {
        const cachedCategories = Array.from(
          new Set(cachedExercises.map((exercise) => exercise.category).filter(Boolean))
        ).sort();
        const cachedDifficulties = Array.from(
          new Set(cachedExercises.map((exercise) => exercise.difficulty).filter(Boolean))
        ).sort();
        setExercises(cachedExercises);
        setCategories(cachedCategories);
        setDifficulties(cachedDifficulties);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load exercises');
      }
    } finally {
      setLoading(false);
    }
  }, [language, filters, isEnabled]);

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
    } catch (err: any) {
      // PGRST116 означает, что у пользователя еще нет статистики - это нормально
      if (err?.code === 'PGRST116') {
        console.log('💪 У пользователя еще нет статистики упражнений');
        setUserStats({});
      } else {
        console.warn('⚠️ Ошибка загрузки статистики упражнений (не критично):', err?.message || 'Unknown error');
      setUserStats({});
      }
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
      // Импортируем функцию загрузки текущего пользователя
      const { loadCurrentUser } = await import('../utils/playerStorage');
      const user = await loadCurrentUser();
      
      if (user && user.id) {
        await ExerciseService.markExerciseAsCompleted(user.id, exerciseId);
        console.log('✅ Упражнение отмечено как выполненное');
        
        // КРИТИЧНО: Инвалидируем кеш профиля пользователя!
        // Это обновит раздел "выполненные упражнения" в профиле
        await dataCache.invalidate(CACHE_KEYS.USER_PROFILE);
        
        // Инвалидируем кеш статистики пользователя
        await dataCache.invalidate(`${CACHE_KEYS.USER_STATS}_${user.id}`);
        
        // Инвалидируем кеш рейтинга упражнений
        await dataCache.invalidate(CACHE_KEYS.EXERCISE_RANKINGS);
        
        // Очищаем кеш игрока для актуальности данных при следующей проверке
        try {
          const playerStorage = await import('../utils/playerStorage');
          await playerStorage.clearPlayerCache(user.id);
        } catch (cacheError) {
          console.warn('⚠️ Не удалось очистить кеш:', cacheError);
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
    if (!isEnabled) {
      return;
    }
    await loadExercises();
  }, [loadExercises, isEnabled]);

  // Загружаем данные при монтировании и изменении языка
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    loadExercises();
    loadUserStats();
  }, [language, isEnabled, loadExercises, loadUserStats]); // Убираем фильтры из зависимостей

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