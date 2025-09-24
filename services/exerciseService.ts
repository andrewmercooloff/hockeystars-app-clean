import { supabase } from '../utils/supabase';
import { 
  SupabaseExercise, 
  Exercise, 
  LocalizedExercise, 
  Language, 
  ExerciseFilters,
  transformSupabaseExerciseToExercise,
  localizeExercise
} from '../types/exercise';

export class ExerciseService {
  /**
   * Получить все упражнения
   */
  static async getAllExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    try {
      console.log('🔄 ExerciseService.getAllExercises вызван с фильтрами:', filters);
      
      let query = supabase
        .from('exercises')
        .select(`
          *,
          category_ru,
          category_en,
          difficulty_ru,
          difficulty_en,
          duration_ru,
          duration_en
        `)
        .eq('is_active', true);

      // Применяем фильтры
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.search) {
        // Поиск по названию на русском и английском
        query = query.or(`title_ru.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('exercise_id', { ascending: true });

      if (error) {
        console.error('❌ Ошибка получения упражнений:', error);
        throw error;
      }

      console.log('✅ Упражнения получены из базы:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('📋 Первое упражнение из базы:', data[0]);
      }
      
      const transformed = data?.map(transformSupabaseExerciseToExercise) || [];
      console.log('🔄 Преобразовано упражнений:', transformed.length);
      
      return transformed;
    } catch (error) {
      console.error('Error in getAllExercises:', error);
      throw error;
    }
  }

  /**
   * Получить упражнение по ID
   */
  static async getExerciseById(exerciseId: string): Promise<Exercise | null> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('❌ Упражнение не найдено:', exerciseId);
          return null; // Упражнение не найдено
        }
        console.error('❌ Ошибка при поиске упражнения:', error);
        throw error;
      }

      return transformSupabaseExerciseToExercise(data);
    } catch (error) {
      console.error('❌ Ошибка в getExerciseById:', error);
      throw error;
    }
  }

  /**
   * Получить локализованные упражнения
   */
  static async getLocalizedExercises(
    language: Language = 'ru', 
    filters?: ExerciseFilters
  ): Promise<LocalizedExercise[]> {
    try {
      const exercises = await this.getAllExercises(filters);
      return exercises.map(exercise => localizeExercise(exercise, language));
    } catch (error) {
      console.error('Error in getLocalizedExercises:', error);
      throw error;
    }
  }

  /**
   * Получить локализованное упражнение по ID
   */
  static async getLocalizedExerciseById(
    exerciseId: string, 
    language: Language = 'ru'
  ): Promise<LocalizedExercise | null> {
    try {
      const exercise = await this.getExerciseById(exerciseId);
      if (!exercise) {
        return null;
      }
      return localizeExercise(exercise, language);
    } catch (error) {
      console.error('Error in getLocalizedExerciseById:', error);
      throw error;
    }
  }

  /**
   * Получить все категории упражнений
   */
  static async getExerciseCategories(language: Language = 'ru'): Promise<string[]> {
    try {
      const column = language === 'ru' ? 'category_ru' : 'category_en';
      const { data, error } = await supabase
        .from('exercises')
        .select(column)
        .eq('is_active', true)
        .not(column, 'is', null)
        .order(column);

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      // Убираем дубликаты
      const categories = [...new Set(data?.map(item => item[column]) || [])];
      return categories;
    } catch (error) {
      console.error('Error in getExerciseCategories:', error);
      throw error;
    }
  }

  /**
   * Получить все уровни сложности
   */
  static async getExerciseDifficulties(language: Language = 'ru'): Promise<string[]> {
    try {
      const column = language === 'ru' ? 'difficulty_ru' : 'difficulty_en';
      const { data, error } = await supabase
        .from('exercises')
        .select(column)
        .eq('is_active', true)
        .not(column, 'is', null)
        .order(column);

      if (error) {
        console.error('Error fetching difficulties:', error);
        throw error;
      }

      // Убираем дубликаты
      const difficulties = [...new Set(data?.map(item => item[column]) || [])];
      return difficulties;
    } catch (error) {
      console.error('Error in getExerciseDifficulties:', error);
      throw error;
    }
  }

  /**
   * Создать новое упражнение (только для администраторов)
   */
  static async createExercise(exercise: Omit<SupabaseExercise, 'id' | 'created_at' | 'updated_at'>): Promise<Exercise> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert([exercise])
        .select()
        .single();

      if (error) {
        console.error('Error creating exercise:', error);
        throw error;
      }

      return transformSupabaseExerciseToExercise(data);
    } catch (error) {
      console.error('Error in createExercise:', error);
      throw error;
    }
  }

  /**
   * Обновить упражнение (только для администраторов)
   */
  static async updateExercise(
    exerciseId: string, 
    updates: Partial<Omit<SupabaseExercise, 'id' | 'exercise_id' | 'created_at' | 'updated_at'>>
  ): Promise<Exercise> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('exercise_id', exerciseId)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercise:', error);
        throw error;
      }

      return transformSupabaseExerciseToExercise(data);
    } catch (error) {
      console.error('Error in updateExercise:', error);
      throw error;
    }
  }

  /**
   * Удалить упражнение (только для администраторов)
   */
  static async deleteExercise(exerciseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ is_active: false })
        .eq('exercise_id', exerciseId);

      if (error) {
        console.error('Error deleting exercise:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteExercise:', error);
      throw error;
    }
  }

  /**
   * Получить статистику упражнений пользователя
   */
  static async getUserExerciseStats(userId: string): Promise<{ [exerciseId: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('exercise_stats')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user exercise stats:', error);
        throw error;
      }

      if (!data?.exercise_stats) {
        return {};
      }

      const stats = typeof data.exercise_stats === 'string' 
        ? JSON.parse(data.exercise_stats) 
        : data.exercise_stats;

      // Если stats уже содержит completions, возвращаем их
      // Иначе возвращаем сам stats (для обратной совместимости)
      if (stats.completions && typeof stats.completions === 'object' && !Array.isArray(stats.completions)) {
        // Новый формат: { "exerciseId": count }
        return stats.completions;
      } else if (Array.isArray(stats.completions)) {
        // Старый формат: [{ "exerciseId": "id", "completedAt": "date", "count": number }]
        const result = {};
        stats.completions.forEach(completion => {
          result[completion.exerciseId] = completion.count;
        });
        return result;
      } else {
        // Обратная совместимость
        return stats || {};
      }
    } catch (error) {
      console.error('Error in getUserExerciseStats:', error);
      throw error;
    }
  }

  /**
   * Отметить упражнение как выполненное
   */
  static async markExerciseAsCompleted(userId: string, exerciseId: string): Promise<void> {
    try {
      console.log('🔄 ExerciseService.markExerciseAsCompleted вызван:', { userId, exerciseId });
      
      // Получаем текущую статистику
      const currentStats = await this.getUserExerciseStats(userId);
      console.log('📊 Текущая статистика пользователя:', currentStats);
      
      // Увеличиваем счетчик для упражнения
      const newStats = {
        ...currentStats,
        [exerciseId]: (currentStats[exerciseId] || 0) + 1
      };
      
      console.log('📈 Новая статистика:', newStats);

      // Обновляем статистику в базе данных
      const exerciseStatsData = {
        completions: newStats,
        totalCompletions: Object.values(newStats).reduce((sum, count) => sum + count, 0)
      };
      
      console.log('💾 Сохраняем в базу данных:', exerciseStatsData);
      
      const { error } = await supabase
        .from('players')
        .update({ 
          exercise_stats: JSON.stringify(exerciseStatsData)
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating exercise stats:', error);
        throw error;
      }
      
      console.log('✅ Статистика успешно обновлена в базе данных');
      
      // Обновляем локальный кэш пользователя
      try {
        const { loadCurrentUser, saveCurrentUser } = await import('../utils/playerStorage');
        const currentUser = await loadCurrentUser();
        if (currentUser && currentUser.id === userId) {
          // Обновляем статистику в локальном кэше
          currentUser.exerciseStats = {
            completions: newStats,
            totalCompletions: exerciseStatsData.totalCompletions
          };
          await saveCurrentUser(currentUser);
          console.log('💾 Локальный кэш пользователя обновлен');
        }
      } catch (cacheError) {
        console.warn('⚠️ Не удалось обновить локальный кэш:', cacheError);
      }
      
    } catch (error) {
      console.error('❌ Error in markExerciseAsCompleted:', error);
      throw error;
    }
  }

  /**
   * Получить общий рейтинг упражнений (популярность среди всех пользователей)
   */
  static async getExerciseRankings(): Promise<{ [exerciseId: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('exercise_stats')
        .not('exercise_stats', 'is', null);

      if (error) {
        console.error('Error fetching exercise rankings:', error);
        throw error;
      }

      const rankings: { [exerciseId: string]: number } = {};

      data?.forEach(player => {
        if (player.exercise_stats) {
          const stats = typeof player.exercise_stats === 'string' 
            ? JSON.parse(player.exercise_stats) 
            : player.exercise_stats;

          if (stats.completions) {
            Object.entries(stats.completions).forEach(([exerciseId, count]) => {
              rankings[exerciseId] = (rankings[exerciseId] || 0) + (count as number);
            });
          }
        }
      });

      return rankings;
    } catch (error) {
      console.error('Error in getExerciseRankings:', error);
      throw error;
    }
  }
}
