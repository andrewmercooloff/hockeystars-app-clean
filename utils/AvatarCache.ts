import React from 'react';
import { Image } from 'expo-image';

// Глобальный кеш для аватаров
class AvatarCache {
  private static instance: AvatarCache;
  private cache: Map<string, string> = new Map(); // playerId -> avatarUrl
  private listeners: Set<(playerId: string, newAvatarUrl: string) => void> = new Set();

  static getInstance(): AvatarCache {
    if (!AvatarCache.instance) {
      AvatarCache.instance = new AvatarCache();
    }
    return AvatarCache.instance;
  }

  // Получаем аватар из кеша
  getAvatar(playerId: string): string | null {
    return this.cache.get(playerId) || null;
  }

  // Устанавливаем аватар в кеш
  async setAvatar(playerId: string, avatarUrl: string): Promise<string | null> {
    const oldUrl = this.cache.get(playerId);
    
    try {
      // Предзагружаем изображение с высоким приоритетом
      await Image.prefetch(avatarUrl);

      // Сохраняем в кэш
      this.cache.set(playerId, avatarUrl);
      
      // Если аватар изменился, уведомляем всех слушателей
      if (oldUrl !== avatarUrl) {
        console.log('🔄 Аватар обновлен в кеше:', { playerId, oldUrl, newUrl: avatarUrl });
        this.notifyListeners(playerId, avatarUrl);
      }
      
      return avatarUrl;
    } catch (error) {
      console.error('❌ Ошибка предзагрузки аватара:', error);
      return null;
    }
  }

  // Подписываемся на изменения аватаров
  subscribe(listener: (playerId: string, newAvatarUrl: string) => void): () => void {
    this.listeners.add(listener);
    
    // Возвращаем функцию отписки
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Уведомляем всех слушателей об изменении
  private notifyListeners(playerId: string, newAvatarUrl: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(playerId, newAvatarUrl);
      } catch (error) {
        console.error('❌ Ошибка в слушателе кэша аватаров:', error);
      }
    });
  }

  // Очищаем кеш для конкретного игрока
  clearAvatar(playerId: string): void {
    this.cache.delete(playerId);
  }

  // Предзагружаем аватары для списка игроков
  async preloadPlayerAvatars(players: { id: string; avatar?: string | null }[]): Promise<void> {
    const preloadTasks = players
      .filter(p => p.avatar)
      .map(async p => {
        try {
          await this.setAvatar(p.id, p.avatar!);
        } catch (error) {
          console.error(`❌ Ошибка предзагрузки аватара для ${p.id}:`, error);
        }
      });
    
    await Promise.allSettled(preloadTasks);
  }

  // Получаем все кешированные аватары
  getAllAvatars(): Map<string, string> {
    return new Map(this.cache);
  }
}

export const avatarCache = AvatarCache.getInstance();

// Хук для подписки на изменения аватаров
export const useAvatarCache = (playerId: string, fallbackUrl?: string) => {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() => 
    avatarCache.getAvatar(playerId)
  );

  React.useEffect(() => {
    // Если нет аватара в кеше, но есть fallback URL, устанавливаем его
    const currentCachedAvatar = avatarCache.getAvatar(playerId);
    if (!currentCachedAvatar && fallbackUrl) {
      avatarCache.setAvatar(playerId, fallbackUrl)
        .then(localUri => {
          if (localUri) {
            setAvatarUrl(localUri);
          }
        })
        .catch(() => {});
    } else if (currentCachedAvatar) {
      setAvatarUrl(currentCachedAvatar);
    }

    // Подписываемся на изменения
    const unsubscribe = avatarCache.subscribe((changedPlayerId, newAvatarUrl) => {
      if (changedPlayerId === playerId) {
        setAvatarUrl(newAvatarUrl);
      }
    });

    return unsubscribe;
  }, [playerId, fallbackUrl]);

  return avatarUrl;
};

// Функция для обновления аватара во всех местах
export const updateAvatarGlobally = async (playerId: string, newAvatarUrl: string): Promise<void> => {
  console.log('🌍 Обновляем аватар глобально:', { playerId, newAvatarUrl });
  await avatarCache.setAvatar(playerId, newAvatarUrl);
};

// Функция для предзагрузки аватара
export const preloadAvatar = async (avatarUrl: string): Promise<void> => {
  if (!avatarUrl || avatarUrl.startsWith('file://') || avatarUrl.startsWith('content://')) {
    return; // Не предзагружаем локальные файлы
  }

  try {
    await Image.prefetch(avatarUrl);
    console.log('🖼️ Аватар предзагружен:', avatarUrl);
  } catch (error) {
    console.error('❌ Ошибка предзагрузки аватара:', avatarUrl, error);
  }
};

// Функция для предзагрузки аватаров игроков
export const preloadPlayerAvatars = async (players: Array<{ id: string; avatar?: string }>): Promise<void> => {
  const preloadTasks = players
    .filter(player => player.avatar)
    .map(async player => {
      await preloadAvatar(player.avatar!);
    });

  try {
    await Promise.all(preloadTasks);
    console.log('🖼️ Предзагрузка аватаров завершена');
  } catch (error) {
    console.error('❌ Ошибка предзагрузки аватаров:', error);
  }
};
