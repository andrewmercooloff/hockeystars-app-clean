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
        // Поиск по номеру упражнения и названию на русском и английском
        const searchTerm = filters.search.replace('#', ''); // Убираем # если пользователь его ввел
        query = query.or(`exercise_id.ilike.%${searchTerm}%,title_ru.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('exercise_id', { ascending: true });

      if (error) {
        console.error('❌ Ошибка получения упражнений:', error);
        throw new Error(`Ошибка загрузки упражнений: ${error.message}`);
      }

      const transformed = data?.map(transformSupabaseExerciseToExercise) || [];
      
      return transformed;
    } catch (error) {
      console.error('Error in getAllExercises:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Неизвестная ошибка при загрузке упражнений');
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
   * Получить локализованные упражнения (все, без фильтров)
   */
  static async getLocalizedExercises(
    language: Language = 'ru', 
    filters?: ExerciseFilters
  ): Promise<LocalizedExercise[]> {
    try {
      // Игнорируем фильтры для загрузки всех упражнений
      const exercises = await this.getAllExercises();
      return exercises.map(exercise => localizeExercise(exercise, language));
    } catch (error) {
      console.error('Error in getLocalizedExercises:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Ошибка при локализации упражнений');
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
        throw new Error(`Ошибка загрузки категорий: ${error.message}`);
      }

      // Убираем дубликаты
      const categories = [...new Set(data?.map((item: any) => item[column]) || [])];
      return categories;
    } catch (error) {
      console.error('Error in getExerciseCategories:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Ошибка при загрузке категорий упражнений');
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
        throw new Error(`Ошибка загрузки сложностей: ${error.message}`);
      }

      // Убираем дубликаты
      const difficulties = [...new Set(data?.map((item: any) => item[column]) || [])];
      return difficulties;
    } catch (error) {
      console.error('Error in getExerciseDifficulties:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Ошибка при загрузке уровней сложности');
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
      console.log('💪 getUserExerciseStats вызван для пользователя:', userId);
      
      const { data, error } = await supabase
        .from('players')
        .select('exercise_stats')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user exercise stats:', error);
        throw error;
      }

      console.log('💪 Получены данные из базы:', { data, exercise_stats: data?.exercise_stats });

      if (!data?.exercise_stats) {
        console.log('💪 Нет данных exercise_stats, возвращаем пустой объект');
        return {};
      }

      const stats = typeof data.exercise_stats === 'string' 
        ? JSON.parse(data.exercise_stats) 
        : data.exercise_stats;

      console.log('💪 Парсированные данные exercise_stats:', stats);

      // Если stats уже содержит completions, возвращаем их
      // Иначе возвращаем сам stats (для обратной совместимости)
      if (stats.completions && typeof stats.completions === 'object' && !Array.isArray(stats.completions)) {
        // Новый формат: { "exerciseId": count }
        console.log('💪 Используем новый формат данных:', stats.completions);
        return stats.completions;
      } else if (Array.isArray(stats.completions)) {
        // Старый формат: [{ "exerciseId": "id", "completedAt": "date", "count": number }]
        console.log('💪 Используем старый формат данных:', stats.completions);
        const result: { [key: string]: number } = {};
        stats.completions.forEach((completion: any) => {
          result[completion.exerciseId] = completion.count;
        });
        console.log('💪 Конвертированный результат:', result);
        return result;
      } else {
        // Обратная совместимость
        console.log('💪 Используем обратную совместимость:', stats);
        return stats || {};
      }
    } catch (error) {
      console.error('❌ Error in getUserExerciseStats:', error);
      throw error;
    }
  }

  /**
   * Отметить упражнение как выполненное
   */
  static async markExerciseAsCompleted(userId: string, exerciseId: string): Promise<void> {
    try {
      console.log('💪 ExerciseService.markExerciseAsCompleted вызван:', { userId, exerciseId });
      
      // Получаем текущую статистику
      console.log('💪 Получаем текущую статистику пользователя...');
      const currentStats = await this.getUserExerciseStats(userId);
      console.log('💪 Текущая статистика:', currentStats);
      
      // Увеличиваем счетчик для упражнения
      const newStats = {
        ...currentStats,
        [exerciseId]: (currentStats[exerciseId] || 0) + 1
      };
      
      console.log('💪 Новая статистика после увеличения:', newStats);
      
      // Обновляем статистику в базе данных
      const exerciseStatsData = {
        completions: newStats,
        totalCompletions: Object.values(newStats).reduce((sum, count) => sum + count, 0)
      };
      
      console.log('💪 Данные для сохранения в базу:', {
        userId,
        exerciseId,
        currentStats,
        newStats,
        exerciseStatsData,
        jsonString: JSON.stringify(exerciseStatsData)
      });
      
      const { error } = await supabase
        .from('players')
        .update({ 
          exercise_stats: JSON.stringify(exerciseStatsData)
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating exercise stats:', error);
        console.error('❌ Error details:', error.message, error.details, error.hint);
        throw error;
      }
      
      console.log('✅ Статистика упражнений успешно обновлена в базе данных');
      
      // Инвалидируем кеш рейтинга упражнений
      try {
        const { dataCache, CACHE_KEYS } = await import('../utils/DataCache');
        await dataCache.invalidate(CACHE_KEYS.EXERCISE_RANKINGS);
        console.log('✅ Кеш рейтинга упражнений инвалидирован');
      } catch (cacheError) {
        console.warn('⚠️ Не удалось инвалидировать кеш рейтинга:', cacheError);
      }
      
      // Очищаем кеш статистики упражнений для пользователя
      try {
        const { clearPlayerExerciseStatsCache, clearPlayerCache } = await import('../utils/playerStorage');
        await clearPlayerExerciseStatsCache(userId);
        await clearPlayerCache(userId); // Очищаем основной кеш игрока
        console.log('✅ Кеш статистики упражнений и кеш игрока очищены');
      } catch (cacheError) {
        console.warn('⚠️ Не удалось очистить кеш статистики упражнений:', cacheError);
      }
      
      // Обновляем локальный кэш пользователя
      try {
        const { loadCurrentUser, saveCurrentUser } = await import('../utils/playerStorage');
        const currentUser = await loadCurrentUser();
        if (currentUser && currentUser.id === userId) {
          // Обновляем статистику в локальном кэше
          currentUser.exerciseStats = {
            completions: newStats,
            totalCompletions: exerciseStatsData.totalCompletions
          } as any;
          await saveCurrentUser(currentUser);
          console.log('✅ Локальный кэш пользователя обновлен');
        }
      } catch (cacheError) {
        console.warn('⚠️ Не удалось обновить локальный кэш:', cacheError);
      }
      
      // Отправляем уведомления друзьям о выполнении упражнения
      try {
        const { loadCurrentUser, notifyFriendsAboutExercise } = await import('../utils/playerStorage');
        const currentUser = await loadCurrentUser();
        
        if (currentUser && currentUser.id === userId && currentUser.name) {
          await notifyFriendsAboutExercise(
            userId,
            currentUser.name,
            exerciseId
          );
        }
      } catch (notificationError) {
        console.error('❌ Ошибка отправки уведомлений об упражнении:', notificationError);
        // Не прерываем выполнение, если уведомления не отправились
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
        throw new Error(`Ошибка загрузки рейтингов: ${error.message}`);
      }

      const rankings: { [exerciseId: string]: number } = {};

      data?.forEach(player => {
        if (player.exercise_stats) {
          const stats = typeof player.exercise_stats === 'string' 
            ? JSON.parse(player.exercise_stats) 
            : player.exercise_stats;

          if (stats.completions) {
            // Обрабатываем оба формата: массив и объект
            if (Array.isArray(stats.completions)) {
              // Старый формат: массив с объектами { exerciseId, count, completedAt }
              stats.completions.forEach((completion: any) => {
                rankings[completion.exerciseId] = (rankings[completion.exerciseId] || 0) + (completion.count || 0);
              });
            } else {
              // Новый формат: объект { exerciseId: count }
              Object.entries(stats.completions).forEach(([exerciseId, count]) => {
                rankings[exerciseId] = (rankings[exerciseId] || 0) + (count as number);
              });
            }
          }
        }
      });

      return rankings;
    } catch (error) {
      console.error('Error in getExerciseRankings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Ошибка при загрузке рейтингов упражнений');
    }
  }
}
