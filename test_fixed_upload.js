// Скрипт для тестирования исправленной функции uploadImageToStorage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Имитируем функцию uploadImageToStorage
const uploadImageToStorage = async (imageUri, fileName) => {
  try {
    console.log('📤 Начинаем загрузку изображения в Supabase Storage...');
    console.log('📁 Входной URI:', imageUri);
    
    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    let finalFileName = fileName || `avatar_${timestamp}.${fileExtension}`;
    
    // Очищаем имя файла от лишних слешей
    finalFileName = finalFileName.replace(/^\/+/, '').replace(/\/+$/, '');
    
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
    
    console.log('✅ Файл загружен в Storage:', data.path);
    
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
    
    // Проверяем, нет ли двойных слешей в URL
    if (publicUrl.includes('avatars//')) {
      console.error('❌ ОБНАРУЖЕН ДВОЙНОЙ СЛЕШ В URL!');
      console.error('URL:', publicUrl);
      return null;
    }
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Ошибка загрузки изображения:', error);
    return null;
  }
};

async function testFixedUpload() {
  console.log('🧪 Тестирование исправленной функции uploadImageToStorage...\n');
  
  // Тестируем разные варианты имен файлов
  const testCases = [
    { uri: 'file://test.jpg', fileName: 'test_avatar.jpg' },
    { uri: 'file://test.jpg', fileName: '/test_avatar.jpg' },  // со слешем в начале
    { uri: 'file://test.jpg', fileName: 'test_avatar.jpg/' },  // со слешем в конце
    { uri: 'file://test.jpg', fileName: '/test_avatar.jpg/' }, // со слешами с обеих сторон
    { uri: 'file://test.jpg', fileName: undefined }, // без fileName
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Тест: URI="${testCase.uri}", fileName="${testCase.fileName}"`);
    
    try {
      const result = await uploadImageToStorage(testCase.uri, testCase.fileName);
      
      if (result) {
        console.log('✅ Успешно загружено:', result);
        
        // Проверяем доступность
        try {
          const response = await fetch(result, { method: 'HEAD' });
          console.log('📊 HTTP статус:', response.status);
        } catch (fetchError) {
          console.log('⚠️ Не удалось проверить доступность');
        }
      } else {
        console.log('❌ Загрузка не удалась');
      }
    } catch (error) {
      console.error('❌ Ошибка теста:', error);
    }
  }
  
  console.log('\n🎉 Тестирование завершено!');
}

// Запускаем тест
testFixedUpload(); 