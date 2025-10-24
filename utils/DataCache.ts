import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class DataCache {
  private static instance: DataCache;
  private cachePrefix = 'hockey_cache_';
  private defaultExpiry = 5 * 60 * 1000; // 5 минут по умолчанию

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  /**
   * Сохраняет данные в кеш
   */
  async set<T>(key: string, data: T, expiryMs?: number): Promise<void> {
    try {
      const expiry = expiryMs || this.defaultExpiry;
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiry
      };

      await AsyncStorage.setItem(
        `${this.cachePrefix}${key}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.error('❌ Ошибка сохранения в кеш:', error);
    }
  }

  /**
   * Получает данные из кеша
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      
      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Проверяем, не истек ли кеш
      if (Date.now() > cacheItem.expiry) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('❌ Ошибка получения из кеша:', error);
      return null;
    }
  }

  /**
   * Удаляет данные из кеша
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
    } catch (error) {
      console.error('❌ Ошибка удаления из кеша:', error);
    }
  }

  /**
   * Очищает весь кеш
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('❌ Ошибка очистки кеша:', error);
    }
  }

  /**
   * Проверяет, есть ли данные в кеше и не истекли ли они
   */
  async has(key: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      
      if (!cached) {
        return false;
      }

      const cacheItem: CacheItem<any> = JSON.parse(cached);
      return Date.now() <= cacheItem.expiry;
    } catch (error) {
      console.error('❌ Ошибка проверки кеша:', error);
      return false;
    }
  }

  /**
   * Получает данные из кеша или выполняет функцию загрузки
   */
  async getOrLoad<T>(
    key: string, 
    loadFunction: () => Promise<T>, 
    expiryMs?: number
  ): Promise<T> {
    // Сначала проверяем кеш
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Если в кеше нет, загружаем данные
    const data = await loadFunction();
    
    // Сохраняем в кеш
    await this.set(key, data, expiryMs);
    
    return data;
  }

  /**
   * Инвалидирует кеш (удаляет конкретный ключ)
   */
  async invalidate(key: string): Promise<void> {
    await this.remove(key);
  }

  /**
   * Инвалидирует кеш по паттерну
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.cachePrefix) && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('❌ Ошибка инвалидации кеша по паттерну:', error);
    }
  }
}

export const dataCache = DataCache.getInstance();

// Константы для ключей кеша
export const CACHE_KEYS = {
  PLAYERS: 'players',
  EXERCISES: 'exercises',
  EXERCISE_CATEGORIES: 'exercise_categories',
  EXERCISE_DIFFICULTIES: 'exercise_difficulties',
  EXERCISE_RANKINGS: 'exercise_rankings',
  USER_STATS: 'user_stats',
  NOTIFICATIONS: 'notifications',
  FRIEND_REQUESTS: 'friend_requests',
  MESSAGES: 'messages',
  USER_PROFILE: 'user_profile'
} as const;

