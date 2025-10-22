import { useCallback, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { loadNotifications, getUserConversations } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';

interface PreloadedData {
  notifications: any[];
  conversations: any;
  lastPreloadTime: number;
}

class DataPreloader {
  private static instance: DataPreloader;
  private cache: Map<string, PreloadedData> = new Map();
  private preloadPromises: Map<string, Promise<void>> = new Map();

  static getInstance(): DataPreloader {
    if (!DataPreloader.instance) {
      DataPreloader.instance = new DataPreloader();
    }
    return DataPreloader.instance;
  }

  async preloadUserData(userId: string): Promise<void> {
    // Проверяем, не загружаем ли мы уже данные для этого пользователя
    if (this.preloadPromises.has(userId)) {
      return this.preloadPromises.get(userId);
    }

    const preloadPromise = this.performPreload(userId);
    this.preloadPromises.set(userId, preloadPromise);

    try {
      await preloadPromise;
    } finally {
      this.preloadPromises.delete(userId);
    }
  }

  private async performPreload(userId: string): Promise<void> {
    try {
      console.log('🚀 Предзагрузка данных для пользователя:', userId);

      // Параллельно загружаем уведомления и сообщения
      const [notifications, conversations] = await Promise.all([
        loadNotifications(userId),
        getUserConversations(userId)
      ]);

      // Сохраняем в кеш
      this.cache.set(userId, {
        notifications,
        conversations,
        lastPreloadTime: Date.now()
      });

      console.log('✅ Предзагрузка завершена:', {
        notifications: notifications.length,
        conversations: Object.keys(conversations).length
      });
    } catch (error) {
      console.error('❌ Ошибка предзагрузки данных:', error);
    }
  }

  getPreloadedData(userId: string): PreloadedData | null {
    const data = this.cache.get(userId);
    
    // Проверяем, не устарели ли данные (старше 30 секунд)
    if (data && Date.now() - data.lastPreloadTime < 30000) {
      return data;
    }
    
    return null;
  }

  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}

export const useDataPreloader = () => {
  const { currentUser } = useUser();
  const preloader = useRef(DataPreloader.getInstance());

  const preloadData = useCallback(async () => {
    if (currentUser?.id) {
      await preloader.current.preloadUserData(currentUser.id);
    }
  }, [currentUser?.id]);

  const getPreloadedData = useCallback(() => {
    if (currentUser?.id) {
      return preloader.current.getPreloadedData(currentUser.id);
    }
    return null;
  }, [currentUser?.id]);

  const clearCache = useCallback(() => {
    if (currentUser?.id) {
      preloader.current.clearCache(currentUser.id);
    }
  }, [currentUser?.id]);

  // Автоматическая предзагрузка при изменении пользователя
  useEffect(() => {
    if (currentUser?.id) {
      preloadData();
    }
  }, [currentUser?.id, preloadData]);

  return {
    preloadData,
    getPreloadedData,
    clearCache
  };
};

