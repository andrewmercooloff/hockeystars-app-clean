import { Image } from 'react-native';

// Глобальный кеш для изображений
class ImageCache {
  private static instance: ImageCache;
  private cache: Map<string, any> = new Map();
  private preloadPromises: Map<string, Promise<void>> = new Map();

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  // Предзагружаем изображение
  async preloadImage(imageSource: any): Promise<void> {
    const key = this.getImageKey(imageSource);
    
    if (this.cache.has(key)) {
      return; // Уже загружено
    }

    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key); // Уже загружается
    }

    const preloadPromise = this.performPreload(imageSource, key);
    this.preloadPromises.set(key, preloadPromise);

    try {
      await preloadPromise;
    } finally {
      this.preloadPromises.delete(key);
    }
  }

  private async performPreload(imageSource: any, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Image.prefetch(Image.resolveAssetSource(imageSource).uri)
        .then(() => {
          this.cache.set(key, imageSource);
          console.log('🖼️ Изображение предзагружено:', key);
          resolve();
        })
        .catch((error) => {
          console.error('❌ Ошибка предзагрузки изображения:', key, error);
          reject(error);
        });
    });
  }

  // Получаем изображение из кеша или возвращаем исходное
  getImage(imageSource: any): any {
    const key = this.getImageKey(imageSource);
    return this.cache.get(key) || imageSource;
  }

  private getImageKey(imageSource: any): string {
    if (typeof imageSource === 'number') {
      // Для require() изображений
      return `asset_${imageSource}`;
    }
    if (imageSource?.uri) {
      return `uri_${imageSource.uri}`;
    }
    return `unknown_${JSON.stringify(imageSource)}`;
  }

  // Очищаем кеш
  clearCache(): void {
    this.cache.clear();
    this.preloadPromises.clear();
  }
}

export const imageCache = ImageCache.getInstance();

// Глобальные изображения приложения
export const APP_IMAGES = {
  LED_BACKGROUND: require('../assets/images/led.jpg'),
  SPLASH_ICON: require('../assets/images/splash-icon.png'),
} as const;

// Предзагружаем критические изображения
export const preloadAppImages = async (): Promise<void> => {
  try {
    console.log('🖼️ Начинаем предзагрузку изображений приложения...');
    
    await Promise.all([
      imageCache.preloadImage(APP_IMAGES.LED_BACKGROUND),
      imageCache.preloadImage(APP_IMAGES.SPLASH_ICON),
    ]);
    
    console.log('✅ Предзагрузка изображений завершена');
  } catch (error) {
    console.error('❌ Ошибка предзагрузки изображений:', error);
  }
};

