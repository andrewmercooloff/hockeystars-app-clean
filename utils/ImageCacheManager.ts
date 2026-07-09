import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

interface CachedImage {
  uri: string;
  localUri?: string;
  timestamp: number;
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache: Map<string, CachedImage> = new Map();
  private CACHE_EXPIRATION = 30 * 24 * 60 * 60 * 1000; // 30 дней
  private CACHE_DIR = `${FileSystem.cacheDirectory}image_cache/`;

  private constructor() {
    this.initCacheDirectory();
    this.cleanupOldCache();
  }

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  private async initCacheDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Ошибка создания директории кэша:', error);
    }
  }

  private generateCacheKey(uri: string): string {
    // Используем хеш URI для создания уникального имени файла
    const hash = this.simpleHash(uri);
    const extension = uri.split('.').pop() || 'jpg';
    return `${hash}.${extension}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async cleanupOldCache() {
    const now = Date.now();
    try {
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.CACHE_DIR}${file}`);
        if (fileInfo.exists && now - fileInfo.modificationTime * 1000 > this.CACHE_EXPIRATION) {
          await FileSystem.deleteAsync(`${this.CACHE_DIR}${file}`);
        }
      }
    } catch (error) {
      console.error('Ошибка очистки старого кэша:', error);
    }
  }

  async cacheImage(uri: string): Promise<string | null> {
    // Проверяем корректность URI
    if (!uri || !uri.startsWith('http')) {
      console.warn(`Некорректный URI для кэширования: ${uri}`);
      return null;
    }

    try {
      // Проверяем существующий кэш
      const existingCache = this.cache.get(uri);
      if (existingCache && existingCache.localUri) {
        // Проверяем срок годности кэша
        if (Date.now() - existingCache.timestamp < this.CACHE_EXPIRATION) {
          const fileInfo = await FileSystem.getInfoAsync(existingCache.localUri);
          if (fileInfo.exists) {
            return existingCache.localUri;
          }
        }
      }

      // Генерируем локальное имя файла
      const cacheKey = this.generateCacheKey(uri);
      const localUri = `${this.CACHE_DIR}${cacheKey}`;

      // Пытаемся скачать файл
      const downloadResult = await FileSystem.downloadAsync(uri, localUri);

      if (downloadResult.status === 200) {
        // Сохраняем в кэш
        const cachedImage = {
          uri,
          localUri: downloadResult.uri,
          timestamp: Date.now()
        };
        this.cache.set(uri, cachedImage);

        return downloadResult.uri;
      } else {
        console.warn(`Не удалось загрузить изображение. Статус: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Ошибка кэширования изображения:', {
        uri,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }

  async preloadImage(uri: string): Promise<string | null> {
    try {
      const localUri = await this.cacheImage(uri);
      
      if (localUri) {
        // Дополнительно предзагружаем через Image.prefetch для React Native
        await Image.prefetch(localUri);
        return localUri;
      }
    } catch (error) {
      console.error('Ошибка предзагрузки изображения:', {
        uri,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    return null;
  }

  // Получаем URI изображения, используя кэш
  async getImageUri(uri: string): Promise<string | null> {
    return this.cacheImage(uri);
  }

  // Очистка всего кэша
  async clearAllCache() {
    try {
      // Физически удаляем все файлы
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      for (const file of files) {
        await FileSystem.deleteAsync(`${this.CACHE_DIR}${file}`);
      }
      
      // Очищаем внутренний кэш
      this.cache.clear();
    } catch (error) {
      console.error('Ошибка очистки кэша:', error);
    }
  }
}

export const imageCacheManager = ImageCacheManager.getInstance();
