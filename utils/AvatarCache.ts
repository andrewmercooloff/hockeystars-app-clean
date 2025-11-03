import React from 'react';
import { Image } from 'expo-image';

// Глобальный кеш для аватаров
class AvatarCache {
  private static instance: AvatarCache;
  private cache: Map<string, string> = new Map(); // playerId -> avatarUrl
  private listeners: Set<(playerId: string, newAvatarUrl: string) => void> = new Set();
  // Храним версии аватаров для каждого игрока, чтобы предотвратить использование старых кешей
  private avatarVersions: Map<string, number> = new Map();

  static getInstance(): AvatarCache {
    if (!AvatarCache.instance) {
      AvatarCache.instance = new AvatarCache();
    }
    return AvatarCache.instance;
  }

  // Получаем аватар из кеша с версией для предотвращения использования старого кеша
  getAvatar(playerId: string): string | null {
    const url = this.cache.get(playerId);
    if (!url) return null;
    
    // Если это HTTP/HTTPS URL - добавляем версию для принудительного обновления
    // Это гарантирует, что expo-image не будет использовать старый кеш
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const version = this.avatarVersions.get(playerId) || 1;
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}_v=${version}`;
    }
    
    return url;
  }
  
  // Получаем чистый URL без версии (для сравнения)
  getRawAvatar(playerId: string): string | null {
    return this.cache.get(playerId) || null;
  }

  // Устанавливаем аватар в кеш
  async setAvatar(playerId: string, avatarUrl: string): Promise<string | null> {
    const oldUrl = this.cache.get(playerId);
    
    // КРИТИЧНО: Если URL не изменился, не обновляем версию и не вызываем уведомления
    // Это предотвращает бесконечный цикл обновлений
    if (oldUrl === avatarUrl) {
      return this.getAvatar(playerId); // Возвращаем URL с текущей версией
    }
    
    // КРИТИЧНО: Если в кеше уже есть URL и новый URL содержит тот же файл
    // НЕ обновляем кеш - игнорируем дублирующие аватары из уведомлений
    if (oldUrl && avatarUrl) {
      // Извлекаем имя файла из URL (последняя часть после последнего /)
      const getFilename = (url: string) => {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        // Удаляем параметры запроса, если есть
        return lastPart.split('?')[0];
      };
      
      const oldFilename = getFilename(oldUrl);
      const newFilename = getFilename(avatarUrl);
      
      // Если имена файлов одинаковы - это тот же аватар, не обновляем
      if (oldFilename === newFilename) {
        // Возвращаем текущий URL с версией без обновления
        return this.getAvatar(playerId);
      }
    }
    
    try {
      // КРИТИЧНО: Инкрементируем версию ТОЛЬКО когда URL действительно изменился
      // Это гарантирует, что expo-image НЕ будет использовать старый кеш
      const currentVersion = this.avatarVersions.get(playerId) || 0;
      const newVersion = currentVersion + 1;
      this.avatarVersions.set(playerId, newVersion);
      
      console.log(`🔄 Обновление версии аватара для ${playerId.substring(0, 8)}: v${currentVersion} -> v${newVersion}
        Старый: ${oldUrl?.substring(oldUrl.length - 20) || 'нет'}
        Новый: ${avatarUrl.substring(avatarUrl.length - 20)}`);
      
      // Предзагружаем новое изображение с версией для гарантии обновления
      let urlToPreload = avatarUrl;
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        const separator = avatarUrl.includes('?') ? '&' : '?';
        urlToPreload = `${avatarUrl}${separator}_v=${newVersion}`;
      }
      
      await Image.prefetch(urlToPreload);

      // Сохраняем чистый URL в кэш (без версии)
      this.cache.set(playerId, avatarUrl);
      
      // Уведомляем всех слушателей об изменении (отправляем URL с версией)
      this.notifyListeners(playerId, this.getAvatar(playerId)!);
      
      return this.getAvatar(playerId);
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
    this.avatarVersions.delete(playerId);
    this.notifyListeners(playerId, '');
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
    avatarCache.getAvatar(playerId) || fallbackUrl || null
  );

  React.useEffect(() => {
    // КРИТИЧНО: Приоритет актуального кеша над fallbackUrl
    // Кеш обновляется через Realtime и содержит самый актуальный аватар (с версией)
    const currentCachedAvatar = avatarCache.getAvatar(playerId); // Возвращает URL с версией
    const rawCachedAvatar = avatarCache.getRawAvatar(playerId); // Возвращает чистый URL
    
    // КРИТИЧНО: Если в кеше есть аватар - используем ТОЛЬКО его (с версией)
    // Игнорируем fallbackUrl ПОЛНОСТЬЮ, даже если он изменяется
    // Это предотвращает переключение между старым и новым аватаром
    setAvatarUrl(prevUrl => {
      // Если есть кеш - используем ТОЛЬКО его, полностью игнорируем fallbackUrl
      if (currentCachedAvatar) {
        // Обновляем только если кеш действительно изменился (версия изменилась)
        if (currentCachedAvatar !== prevUrl) {
          return currentCachedAvatar;
        }
        return prevUrl;
      }
      
      // ТОЛЬКО если в кеше нет аватара - используем fallbackUrl
      if (!currentCachedAvatar && fallbackUrl && fallbackUrl !== prevUrl) {
        return fallbackUrl;
      }
      
      return prevUrl;
    });
    
    // ВАЖНО: Обновляем кеш fallbackUrl ТОЛЬКО если:
    // 1. В кеше нет аватара И fallbackUrl существует
    // НЕ обновляем если в кеше уже есть аватар, даже если fallbackUrl отличается
    // Это предотвращает перезапись актуального аватара старым fallbackUrl
    // КРИТИЧНО: НЕ вызываем setAvatar, если fallbackUrl уже установлен в кеш
    // Это предотвращает бесконечный цикл инкрементирования версий
    if (fallbackUrl && !rawCachedAvatar) {
      // Проверяем, что fallbackUrl действительно новый
      const cachedRawUrl = avatarCache.getRawAvatar(playerId);
      if (cachedRawUrl !== fallbackUrl) {
        // Если в кеше нет аватара или URL отличается, устанавливаем fallbackUrl
        avatarCache.setAvatar(playerId, fallbackUrl)
          .then(localUri => {
            // Используем функциональное обновление, чтобы сравнить с актуальным состоянием
            if (localUri) {
              setAvatarUrl(prevUrl => {
                // Обновляем состояние только если URL изменился
                // НО: если в кеше появился более новый аватар - используем его
                const latestCached = avatarCache.getAvatar(playerId);
                if (latestCached && latestCached !== localUri) {
                  return latestCached; // Используем более новый из кеша
                }
                if (localUri !== prevUrl) {
                  return localUri;
                }
                return prevUrl;
              });
            }
          })
          .catch(() => {});
      }
    }
    // Если fallbackUrl отличается от кеша - ИГНОРИРУЕМ fallbackUrl полностью
    // Кеш имеет абсолютный приоритет, так как обновляется через Realtime

    // Подписываемся на изменения через Realtime
    const unsubscribe = avatarCache.subscribe((changedPlayerId, newAvatarUrl) => {
      if (changedPlayerId === playerId && newAvatarUrl) {
        // КРИТИЧНО: При получении обновления через Realtime ВСЕГДА используем новый аватар
        // newAvatarUrl уже содержит версию, что гарантирует обновление
        // fallbackUrl полностью игнорируется при наличии кеша
        setAvatarUrl(prevUrl => {
          // Обновляем состояние только если URL действительно изменился (версия изменилась)
          if (newAvatarUrl !== prevUrl) {
            return newAvatarUrl;
          }
          return prevUrl;
        });
      }
    });

    return unsubscribe;
  }, [playerId, fallbackUrl]);

  return avatarUrl;
};

// Функция для обновления аватара во всех местах
export const updateAvatarGlobally = async (playerId: string, newAvatarUrl: string): Promise<void> => {
  await avatarCache.setAvatar(playerId, newAvatarUrl);
};

// Функция для предзагрузки аватара
export const preloadAvatar = async (avatarUrl: string): Promise<void> => {
  if (!avatarUrl || avatarUrl.startsWith('file://') || avatarUrl.startsWith('content://')) {
    return; // Не предзагружаем локальные файлы
  }

  try {
    await Image.prefetch(avatarUrl);
  } catch (error) {
    // Ignore prefetch errors
  }
};

// Функция для предзагрузки аватаров игроков
export const preloadPlayerAvatars = async (players: Array<{ id: string; avatar?: string }>): Promise<void> => {
  const preloadTasks = players
    .filter(player => player.avatar)
    .map(async player => {
      // Предзагружаем через expo-image
      await preloadAvatar(player.avatar!);
      // И сохраняем в AvatarCache для мгновенного доступа в профилях
      await avatarCache.setAvatar(player.id, player.avatar!);
    });

  try {
    await Promise.all(preloadTasks);
  } catch (error) {
    // Ignore prefetch errors
  }
};
