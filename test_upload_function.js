// Тестовый скрипт для проверки функции uploadImageToStorage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Имитируем функцию ensureAvatarsBucket
const ensureAvatarsBucket = async () => {
  try {
    console.log('🔍 Проверяем доступ к bucket avatars...');
    
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
      console.log('⚠️ Убедитесь, что bucket avatars существует и доступен');
      return false;
    }
    
    // Удаляем тестовый файл
    await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    console.log('✅ Bucket avatars доступен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки bucket:', error);
    return false;
  }
};

// Имитируем функцию uploadImageToStorage
const uploadImageToStorage = async (imageUri, fileName) => {
  try {
    console.log('📤 Начинаем загрузку изображения в Supabase Storage...');
    console.log('📁 Входной URI:', imageUri);
    
    // Проверяем и создаем bucket если нужно
    const bucketReady = await ensureAvatarsBucket();
    if (!bucketReady) {
      console.error('❌ Не удалось подготовить bucket avatars');
      return null;
    }
    
    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    const finalFileName = fileName || `avatar_${timestamp}.${fileExtension}`;
    
    console.log('📁 Имя файла:', finalFileName);
    
    // Создаем тестовое изображение (1x1 пиксель PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    
    console.log('📤 Загружаем в Supabase Storage...');
    
    // Загружаем в Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(finalFileName, testBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Ошибка загрузки в Storage:', error);
      return null;
    }
    
    console.log('✅ Файл загружен:', data.path);
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(finalFileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('❌ Не удалось получить публичный URL');
      return null;
    }
    
    const publicUrl = urlData.publicUrl;
    console.log('✅ Изображение загружено:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    return null;
  }
};

async function testUploadFunction() {
  console.log('🧪 Тестирование функции uploadImageToStorage...\n');
  
  try {
    // Тестируем с локальным URI (как в приложении)
    const testUri = 'file:///var/mobile/Containers/Data/Application/test.jpg';
    
    console.log('📸 Тестируем загрузку с URI:', testUri);
    
    const result = await uploadImageToStorage(testUri);
    
    if (result) {
      console.log('\n✅ Тест успешен!');
      console.log('🔗 Результат:', result);
    } else {
      console.log('\n❌ Тест не прошел - функция вернула null');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testUploadFunction(); 