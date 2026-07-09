import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

// Функция для проверки bucket avatars
const ensureAvatarsBucket = async () => {
  try {
    // Пытаемся загрузить тестовый файл для проверки доступа к bucket
    const testFileName = `test_access_${Date.now()}.txt`;
    const testContent = 'test';
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Ошибка доступа к bucket avatars:', error);
      return false;
    }
    
    // Удаляем тестовый файл
    await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки bucket:', error);
    return false;
  }
};

// Функция для загрузки изображения в Supabase Storage (для аватаров)
// ВАЖНО: fileName должен быть фиксированным для конкретного игрока (например, avatar_{playerId}.jpg)
// Это позволяет ПЕРЕЗАПИСЫВАТЬ старый аватар вместо создания нового файла
export const uploadImageToStorage = async (imageUri: string, fileName?: string): Promise<string | null> => {
  try {
    
    // Проверяем и создаем bucket если нужно
    const bucketReady = await ensureAvatarsBucket();
    if (!bucketReady) {
      console.error('❌ Не удалось подготовить bucket avatars');
      return null;
    }
    
    // ВАЖНО: Используем переданное имя файла (должно быть привязано к playerId)
    // Если имя не передано - это ошибка, но создаём уникальное для обратной совместимости
    let finalFileName = fileName;
    if (!finalFileName) {
      console.warn('⚠️ uploadImageToStorage: fileName не передан, создаём уникальное имя (нежелательно)');
      const timestamp = Date.now();
      finalFileName = `avatar_${timestamp}.jpg`;
    }
    
    // Очищаем имя файла от лишних слешей
    finalFileName = finalFileName.replace(/^\/+/, '').replace(/\/+$/, '');
    
    // Если это локальный файл, сначала сжимаем его
    let processedImageUri = imageUri;
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      try {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 250 } }], // Уменьшенный размер для аватаров (250px)
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // JPEG для аватаров с сжатием 0.8
        );
        
        processedImageUri = result.uri;
    
      } catch (manipulatorError) {
        console.error('❌ Ошибка обработки изображения:', manipulatorError);
        processedImageUri = imageUri;
      }
    }
    
    if (processedImageUri.startsWith('file://')) {
      // Для локальных файлов в React Native используем FormData напрямую
      try {
        
        const formData = new FormData();
        formData.append('file', {
          uri: processedImageUri,
          type: 'image/jpeg',
          name: finalFileName,
        } as any);
        
        
        // Загружаем напрямую через FormData
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(finalFileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки через FormData:', error);
          return null;
        }
        
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        
        const publicUrl = urlData.publicUrl;
        
        // Проверяем, нет ли двойных слешей в URL
        if (publicUrl.includes('avatars//')) {
          console.error('❌ ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ В URL!');
          console.error('URL:', publicUrl);
          return null;
        }
        
        return publicUrl;
        
      } catch (fileSystemError) {
        console.error('❌ Ошибка FormData:', fileSystemError);
        return null;
      }
    } else {
      // Для других URI используем fetch
      try {
        const response = await fetch(processedImageUri);
        if (!response.ok) {
          console.error('❌ Ошибка fetch:', response.status, response.statusText);
          return null;
        }
        
        // В React Native нет response.blob(), используем arrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          console.error('❌ Пустой arrayBuffer');
          return null;
        }
        
        // Загружаем в Supabase Storage
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(finalFileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки в Storage:', error);
          return null;
        }
        
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        
        const publicUrl = urlData.publicUrl;
        
        // Проверяем, нет ли двойных слешей в URL
        if (publicUrl.includes('avatars//')) {
          console.error('❌ ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ В URL!');
          console.error('URL:', publicUrl);
          return null;
        }
        
        return publicUrl;
        
      } catch (fetchError) {
        console.error('❌ Ошибка fetch:', fetchError);
        return null;
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    return null;
  }
};

// Функция для загрузки фотографий галереи в Supabase Storage
export const uploadGalleryPhoto = async (imageUri: string, fileName?: string): Promise<string | null> => {
  try {
    
    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    let finalFileName = fileName || `gallery_${timestamp}.${fileExtension}`;
    
    // Очищаем имя файла от лишних слешей
    finalFileName = finalFileName.replace(/^\/+/, '').replace(/\/+$/, '');
    
    // Если это локальный файл, сначала сжимаем его
    let processedImageUri = imageUri;
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      try {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }], // Оптимальный размер для галереи - не больше 800px
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // JPEG для галереи - экономия места
        );
        
        processedImageUri = result.uri;

      } catch (manipulatorError) {
        console.error('❌ Ошибка обработки изображения галереи:', manipulatorError);
        processedImageUri = imageUri;
      }
    }
    
    if (processedImageUri.startsWith('file://')) {
      // Для локальных файлов в React Native используем FormData напрямую
      try {
        
        const formData = new FormData();
        formData.append('file', {
          uri: processedImageUri,
          type: 'image/jpeg',
          name: finalFileName,
        } as any);
        
        
        // Загружаем напрямую через FormData
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(finalFileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки фото галереи через FormData:', error);
          return null;
        }
        
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        
        const publicUrl = urlData.publicUrl;
        
        // Проверяем, нет ли двойных слешей в URL
        if (publicUrl.includes('avatars//')) {
          console.error('❌ ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ В URL ГАЛЕРЕИ!');
          console.error('URL:', publicUrl);
          return null;
        }
        
        return publicUrl;
        
      } catch (fileSystemError) {
        console.error('❌ Ошибка FormData для галереи:', fileSystemError);
        return null;
      }
    } else {
      // Для других URI используем fetch
      try {
        const response = await fetch(processedImageUri);
        if (!response.ok) {
          console.error('❌ Ошибка fetch для галереи:', response.status, response.statusText);
          return null;
        }
        
        // В React Native нет response.blob(), используем arrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          console.error('❌ Пустой arrayBuffer галереи');
          return null;
        }
        
        // Загружаем в Supabase Storage
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(finalFileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки фото галереи в Storage:', error);
          return null;
        }
        
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        
        const publicUrl = urlData.publicUrl;
        
        // Проверяем, нет ли двойных слешей в URL
        if (publicUrl.includes('avatars//')) {
          console.error('❌ ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ В URL ГАЛЕРЕИ!');
          console.error('URL:', publicUrl);
          return null;
        }
        
        return publicUrl;
        
      } catch (fetchError) {
        console.error('❌ Ошибка fetch для галереи:', fetchError);
        return null;
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения галереи:', error);
    return null;
  }
};

// Функция для удаления изображения из Storage
export const deleteImageFromStorage = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!imageUrl || !imageUrl.includes('avatars/')) {
      return true; // Не удаляем, если это не наш Storage
    }
    
    // Извлекаем имя файла из URL
    const fileName = imageUrl.split('avatars/').pop()?.split('?')[0];
    if (!fileName) {
      return false;
    }
    
    const { error } = await supabase.storage
      .from('avatars')
      .remove([fileName]);
    
    if (error) {
      console.error('❌ Ошибка удаления изображения:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления изображения:', error);
    return false;
  }
};

// Функция для проверки, является ли URL локальным
export const isLocalImage = (imageUrl: string): boolean => {
  return imageUrl.startsWith('file://') || 
         imageUrl.startsWith('content://') || 
         imageUrl.startsWith('data:');
};

// Функция для миграции локальных изображений в Storage
export const migrateLocalImageToStorage = async (imageUrl: string): Promise<string | null> => {
  if (!isLocalImage(imageUrl)) {
    return imageUrl; // Уже в Storage
  }
  
  return await uploadImageToStorage(imageUrl);
};

// Функция для загрузки изображений подарков в PNG формате (без сжатия)
export const uploadGiftImageToStorage = async (imageUri: string, fileName?: string): Promise<string | null> => {
  try {
    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'png';
    let finalFileName = fileName || `gift_${timestamp}.${fileExtension}`;
    
    // Очищаем имя файла от лишних слешей
    finalFileName = finalFileName.replace(/^\/+/, '').replace(/\/+$/, '');
    
    // Если это локальный файл, обрабатываем его БЕЗ сжатия в PNG
    let processedImageUri = imageUri;
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      try {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }], // Оптимальный размер для подарков
          { compress: 1.0, format: ImageManipulator.SaveFormat.PNG } // PNG без сжатия для подарков
        );
        
        processedImageUri = result.uri;
    
      } catch (manipulatorError) {
        console.error('❌ Ошибка обработки изображения подарка:', manipulatorError);
        processedImageUri = imageUri;
      }
    }
    
    if (processedImageUri.startsWith('file://')) {
      // Для локальных файлов используем FormData
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: processedImageUri,
          type: 'image/png',
          name: finalFileName,
        } as any);
        
        // Загружаем в Supabase Storage
        const { data, error } = await supabase.storage
          .from('items')
          .upload(finalFileName, formData, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки подарка через FormData:', error);
          return null;
        }
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('items')
          .getPublicUrl(data.path);
        
        return urlData.publicUrl;
        
      } catch (fileSystemError) {
        console.error('❌ Ошибка FormData для подарка:', fileSystemError);
        return null;
      }
    } else {
      // Для других URI используем fetch
      try {
        const response = await fetch(processedImageUri);
        if (!response.ok) {
          console.error('❌ Ошибка fetch для подарка:', response.status, response.statusText);
          return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          console.error('❌ Пустой arrayBuffer подарка');
          return null;
        }
        
        // Загружаем в Supabase Storage
        const { data, error } = await supabase.storage
          .from('items')
          .upload(finalFileName, arrayBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (error) {
          console.error('❌ Ошибка загрузки подарка в Storage:', error);
          return null;
        }
        
        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('items')
          .getPublicUrl(data.path);
        
        return urlData.publicUrl;
        
      } catch (fetchError) {
        console.error('❌ Ошибка fetch для подарка:', fetchError);
        return null;
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения подарка:', error);
    return null;
  }
};

// Функция для проверки доступности изображения
export const checkImageAvailability = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Функция для получения рабочего URL изображения с fallback
export const getWorkingImageUrl = async (imageUrl: string, fallbackUrl?: string): Promise<string> => {
  if (!imageUrl) {
    return fallbackUrl || '';
  }
  
  // Если это локальное изображение, возвращаем как есть
  if (isLocalImage(imageUrl)) {
    return imageUrl;
  }
  
  // Проверяем доступность изображения
  const isAvailable = await checkImageAvailability(imageUrl);
  
  if (isAvailable) {
    return imageUrl;
  } else {
    return fallbackUrl || imageUrl; // Возвращаем fallback или оригинальный URL
  }
};

// Копируем content:// / ph:// в cache — readAsStringAsync и иногда FormData не работают напрямую
const resolveVideoUploadUri = async (videoUri: string): Promise<string> => {
  if (videoUri.startsWith('file://')) {
    return videoUri;
  }
  const cachePath = `${FileSystem.cacheDirectory}video_upload_${Date.now()}.mp4`;
  await FileSystem.copyAsync({ from: videoUri, to: cachePath });
  return cachePath;
};

export type UploadVideoResult = { url: string | null; thumbUrl?: string | null; error?: string };

// Загрузка видео в Supabase Storage (bucket: videos)
// Лимит: 20 секунд, выбор из галереи через expo-image-picker
export const uploadVideoToStorage = async (
  videoUri: string,
  playerId: string,
  onProgress?: (progress: number) => void,
  thumbUri?: string,
): Promise<UploadVideoResult> => {
  let localUri = videoUri;
  try {
    // НЕ проверяем supabase.auth.getSession(): приложение использует собственную
    // авторизацию (таблица players), а не Supabase Auth — сессии там никогда нет.
    // Политика bucket'а videos разрешает INSERT для public, поэтому загрузка работает без неё.
    if (!playerId) {
      return { url: null, error: 'Нужно войти в аккаунт' };
    }

    console.log('📹 Загружаем видео в Supabase Storage:', videoUri.substring(0, 60));

    const timestamp = Date.now();
    const fileName = `${playerId}/${timestamp}.mp4`;
    const thumbFileName = `${playerId}/${timestamp}_thumb.jpg`;
    localUri = await resolveVideoUploadUri(videoUri);
    onProgress?.(20);

    const fileResponse = await fetch(localUri);
    if (!fileResponse.ok) {
      return { url: null, error: 'Не удалось прочитать файл с устройства' };
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return { url: null, error: 'Пустой файл видео' };
    }

    onProgress?.(40);

    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, arrayBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (error) {
      console.error('❌ Ошибка загрузки видео:', error.message, error);
      const msg = error.message || '';
      if (msg.toLowerCase().includes('row-level security') || error.message?.includes('403')) {
        return {
          url: null,
          error: 'Нет прав на загрузку. В Supabase выполните database/videos_storage_policies.sql',
        };
      }
      return { url: null, error: msg || 'Ошибка Storage' };
    }

    onProgress?.(70);

    let thumbPublicUrl: string | null = null;
    if (thumbUri) {
      try {
        const thumbResponse = await fetch(thumbUri);
        if (thumbResponse.ok) {
          const thumbBuffer = await thumbResponse.arrayBuffer();
          if (thumbBuffer.byteLength > 0) {
            const { error: thumbError } = await supabase.storage.from('videos').upload(thumbFileName, thumbBuffer, {
              contentType: 'image/jpeg',
              upsert: false,
            });
            if (!thumbError) {
              const { data: thumbUrlData } = supabase.storage.from('videos').getPublicUrl(thumbFileName);
              thumbPublicUrl = thumbUrlData.publicUrl;
            }
          }
        }
      } catch (thumbErr) {
        console.warn('⚠️ Не удалось загрузить превью видео:', thumbErr);
      }
    }

    onProgress?.(90);

    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(data?.path ?? fileName);

    onProgress?.(100);
    console.log('✅ Видео загружено:', urlData.publicUrl);
    return { url: urlData.publicUrl, thumbUrl: thumbPublicUrl };
  } catch (err) {
    console.error('❌ Ошибка uploadVideoToStorage:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Неизвестная ошибка' };
  } finally {
    if (localUri !== videoUri && localUri.startsWith(FileSystem.cacheDirectory ?? '')) {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
  }
};

// Удаление видео из Supabase Storage по публичному URL
export const deleteVideoFromStorage = async (publicUrl: string): Promise<void> => {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/videos/');
    if (pathParts.length < 2) return;
    const filePath = pathParts[1];
    const thumbPath = filePath.replace(/\.mp4$/i, '_thumb.jpg');
  const pathsToRemove = thumbPath !== filePath ? [filePath, thumbPath] : [filePath];
    await supabase.storage.from('videos').remove(pathsToRemove);
    console.log('🗑️ Видео удалено из Storage:', pathsToRemove.join(', '));
  } catch (err) {
    console.error('❌ Ошибка deleteVideoFromStorage:', err);
  }
};