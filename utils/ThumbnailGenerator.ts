import { getStorageObjectUrl, getStoragePublicUrl, supabaseAnonKey } from './supabase';

// Размеры миниатюр, которые мы будем генерировать
export const THUMBNAIL_SIZES = {
  SMALL: 30,
  MEDIUM: 50,
  LARGE: 60,
  XLARGE: 80,
  XXLARGE: 100,
} as const;

export type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

// Интерфейс для результата генерации миниатюр
export interface ThumbnailResult {
  originalUrl: string;
  thumbnails: {
    [K in ThumbnailSize]: string;
  };
}

// Генерируем миниатюры из изображения
export const generateThumbnails = async (
  imageUri: string,
  playerId: string
): Promise<ThumbnailResult> => {
  try {
    console.log(`🖼️ Генерируем миниатюры для ${playerId} из:`, imageUri);

    // Создаем canvas для генерации миниатюр
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Не удалось получить контекст canvas');
    }

    // Загружаем изображение (web-only: используется DOM, как и canvas выше)
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUri;
    });

    const thumbnails: { [K in ThumbnailSize]: string } = {} as any;

    // Генерируем миниатюры для каждого размера
    for (const [sizeName, sizeValue] of Object.entries(THUMBNAIL_SIZES)) {
      const size = sizeName as ThumbnailSize;
      
      // Устанавливаем размер canvas
      canvas.width = sizeValue;
      canvas.height = sizeValue;
      
      // Очищаем canvas
      ctx.clearRect(0, 0, sizeValue, sizeValue);
      
      // Рисуем изображение с правильным масштабированием
      ctx.drawImage(img, 0, 0, sizeValue, sizeValue);
      
      // Конвертируем в base64
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      thumbnails[size] = thumbnailDataUrl;
      
      console.log(`✅ Создана миниатюра ${size} (${sizeValue}px)`);
    }

    console.log(`🎯 Все миниатюры созданы для ${playerId}`);

    return {
      originalUrl: imageUri,
      thumbnails
    };

  } catch (error) {
    console.error(`❌ Ошибка генерации миниатюр для ${playerId}:`, error);
    throw error;
  }
};

// Сохраняем миниатюры в Supabase Storage
export const uploadThumbnails = async (
  thumbnails: ThumbnailResult['thumbnails'],
  playerId: string
): Promise<{ [K in ThumbnailSize]: string }> => {
  try {
    console.log(`📤 Загружаем миниатюры в Supabase для ${playerId}`);

    const uploadedUrls: { [K in ThumbnailSize]: string } = {} as any;

    // Загружаем каждую миниатюру
    for (const [sizeName, thumbnailDataUrl] of Object.entries(thumbnails)) {
      const size = sizeName as ThumbnailSize;
      
      try {
        // Конвертируем base64 в blob
        const response = await fetch(thumbnailDataUrl);
        const blob = await response.blob();
        
        // Создаем FormData для загрузки
        const formData = new FormData();
        formData.append('file', blob, `avatar_${size}_${playerId}.jpg`);
        
        // Загружаем в Supabase Storage
        const uploadResponse = await fetch(
          getStorageObjectUrl('avatars', `thumbnails/${playerId}/avatar_${size}.jpg`),
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          const uploadedUrl = getStoragePublicUrl('avatars', `thumbnails/${playerId}/avatar_${size}.jpg`);
          uploadedUrls[size] = uploadedUrl;
          console.log(`✅ Загружена миниатюра ${size}:`, uploadedUrl);
        } else {
          console.error(`❌ Ошибка загрузки миниатюры ${size}:`, await uploadResponse.text());
        }
      } catch (error) {
        console.error(`❌ Ошибка загрузки миниатюры ${size}:`, error);
      }
    }

    console.log(`🎯 Все миниатюры загружены для ${playerId}`);
    return uploadedUrls;

  } catch (error) {
    console.error(`❌ Ошибка загрузки миниатюр для ${playerId}:`, error);
    throw error;
  }
};

// Полный процесс: генерация + загрузка миниатюр
export const processAvatarThumbnails = async (
  imageUri: string,
  playerId: string
): Promise<{ [K in ThumbnailSize]: string }> => {
  try {
    // Генерируем миниатюры
    const thumbnailResult = await generateThumbnails(imageUri, playerId);
    
    // Загружаем миниатюры в Supabase
    const uploadedUrls = await uploadThumbnails(thumbnailResult.thumbnails, playerId);
    
    return uploadedUrls;
  } catch (error) {
    console.error(`❌ Ошибка обработки миниатюр для ${playerId}:`, error);
    throw error;
  }
};
