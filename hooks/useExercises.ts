import { useState, useEffect, useCallback } from 'react';
import { ExerciseService } from '../services/exerciseService';
import { 
  Exercise, 
  LocalizedExercise, 
  Language, 
  ExerciseFilters,
  ExerciseStats 
} from '../types/exercise';

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

  // Загружаем упражнения
  const loadExercises = useCallback(async () => {
    try {
      console.log('🔄 Загружаем упражнения...', { language, filters });
      setLoading(true);
      setError(null);

      const [exercisesData, categoriesData, difficultiesData, rankingsData] = await Promise.all([
        ExerciseService.getLocalizedExercises(language, filters),
        ExerciseService.getExerciseCategories(language),
        ExerciseService.getExerciseDifficulties(language),
        ExerciseService.getExerciseRankings()
      ]);

      console.log('✅ Упражнения загружены:', { 
        exercisesCount: exercisesData.length, 
        categoriesCount: categoriesData.length,
        difficultiesCount: difficultiesData.length 
      });

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
  }, [language]);

  // Загружаем статистику пользователя
  const loadUserStats = useCallback(async () => {
    try {
      // Импортируем функцию загрузки текущего пользователя
      const { loadCurrentUser } = await import('../utils/playerStorage');
      const user = await loadCurrentUser();
      
      if (user && user.id) {
        const stats = await ExerciseService.getUserExerciseStats(user.id);
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
      console.log('🔄 markAsCompleted вызван для упражнения:', exerciseId);
      
      // Импортируем функцию загрузки текущего пользователя
      const { loadCurrentUser } = await import('../utils/playerStorage');
      const user = await loadCurrentUser();
      
      console.log('👤 Текущий пользователь:', user);
      
      if (user && user.id) {
        console.log('💾 Сохраняем выполнение упражнения в базе данных...');
        await ExerciseService.markExerciseAsCompleted(user.id, exerciseId);
        
        // Обновляем локальную статистику
        setUserStats(prev => {
          const newStats = {
            ...prev,
            [exerciseId]: (prev[exerciseId] || 0) + 1
          };
          console.log('📊 Обновленная статистика пользователя:', newStats);
          return newStats;
        });
        
        console.log('✅ Упражнение успешно отмечено как выполненное');
      } else {
        console.warn('⚠️ Пользователь не найден или нет ID');
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

  // Загружаем данные при монтировании и изменении зависимостей
  useEffect(() => {
    loadExercises();
    loadUserStats();
  }, [language, filters?.category, filters?.difficulty, filters?.search]);

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
