import React from 'react';
import { Image } from 'react-native';

// Размеры аватаров, используемые в приложении
export const AVATAR_SIZES = {
  SMALL: 30,
  MEDIUM: 50,
  LARGE: 60,
  XLARGE: 80,
  XXLARGE: 100,
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

// Кеш миниатюр для разных размеров
class ThumbnailCache {
  private static instance: ThumbnailCache;
  private cache: Map<string, Map<AvatarSize, string>> = new Map();
  private preloadedImages: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ThumbnailCache {
    if (!ThumbnailCache.instance) {
      ThumbnailCache.instance = new ThumbnailCache();
    }
    return ThumbnailCache.instance;
  }

  // Генерируем URL миниатюры для конкретного размера
  private generateThumbnailUrl(originalUrl: string, size: AvatarSize): string {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return originalUrl;
    }

    // Для небольших размеров используем оригинальный URL (быстрее)
    if (size === 'SMALL' || size === 'MEDIUM') {
      return originalUrl;
    }

    // Для больших размеров добавляем параметры ресайза только для Supabase
    if (originalUrl.includes('supabase')) {
      const sizeValue = AVATAR_SIZES[size];
      return `${originalUrl}?width=${sizeValue}&height=${sizeValue}&resize=cover&quality=80`;
    }

    // Для других URL используем оригинальный URL
    return originalUrl;
  }

  // Получаем URL миниатюры для конкретного размера
  getThumbnailUrl(playerId: string, originalUrl: string, size: AvatarSize): string {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return originalUrl;
    }

    // Проверяем кеш
    const playerCache = this.cache.get(playerId);
    if (playerCache && playerCache.has(size)) {
      return playerCache.get(size)!;
    }

    // Генерируем новый URL миниатюры
    const thumbnailUrl = this.generateThumbnailUrl(originalUrl, size);

    // Сохраняем в кеш
    if (!playerCache) {
      this.cache.set(playerId, new Map());
    }
    this.cache.get(playerId)!.set(size, thumbnailUrl);

    return thumbnailUrl;
  }

  // Предзагружаем только оригинальный URL (упрощенная версия)
  async preloadOriginalUrl(playerId: string, originalUrl: string): Promise<void> {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      return;
    }

    const cacheKey = `${playerId}_${originalUrl}`;
    if (this.preloadedImages.has(cacheKey)) {
      return; // Уже предзагружено
    }

    try {
      // Предзагружаем только оригинальный URL
      await Image.prefetch(originalUrl);
      this.preloadedImages.add(cacheKey);
      
      console.log(`🖼️ Оригинальный аватар предзагружен для ${playerId}`);
    } catch (error) {
      console.error(`❌ Ошибка предзагрузки оригинального аватара для ${playerId}:`, error);
    }
  }

  // Предзагружаем аватары для списка игроков
  async preloadPlayersAvatars(players: { id: string; avatar?: string | null }[]): Promise<void> {
    const preloadTasks = players
      .filter(p => p.avatar && p.avatar.startsWith('http'))
      .map(async p => {
        try {
          await this.preloadOriginalUrl(p.id, p.avatar!);
        } catch (error) {
          console.error(`❌ Ошибка предзагрузки аватара для ${p.id}:`, error);
        }
      });

    await Promise.allSettled(preloadTasks);
    console.log(`🖼️ Предзагрузка аватаров завершена для ${players.length} игроков`);
  }

  // Очищаем кеш для конкретного игрока
  clearPlayerCache(playerId: string): void {
    this.cache.delete(playerId);
    console.log(`🗑️ Кеш миниатюр очищен для ${playerId}`);
  }

  // Очищаем весь кеш
  clearAll(): void {
    this.cache.clear();
    this.preloadedImages.clear();
    console.log('🗑️ Весь кеш миниатюр очищен');
  }

  // Получаем статистику кеша
  getCacheStats(): { playersCount: number; totalThumbnails: number } {
    let totalThumbnails = 0;
    this.cache.forEach(playerCache => {
      totalThumbnails += playerCache.size;
    });

    return {
      playersCount: this.cache.size,
      totalThumbnails
    };
  }
}

export const thumbnailCache = ThumbnailCache.getInstance();

// Хук для получения URL миниатюры
export const useThumbnailUrl = (playerId: string, originalUrl: string, size: AvatarSize) => {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string>(() => 
    thumbnailCache.getThumbnailUrl(playerId, originalUrl, size)
  );

  React.useEffect(() => {
    const newUrl = thumbnailCache.getThumbnailUrl(playerId, originalUrl, size);
    setThumbnailUrl(newUrl);
  }, [playerId, originalUrl, size]);

  return thumbnailUrl;
};
