// Тестовый скрипт для прямой загрузки изображений в bucket
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectUpload() {
  console.log('🧪 Тестирование прямой загрузки в bucket avatars...\n');

  try {
    // 1. Тестируем загрузку файла напрямую в bucket avatars
    console.log('1️⃣ Тестируем загрузку файла в bucket avatars...');
    
    // Создаем простой тестовый файл (1x1 пиксель PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    const testFileName = `test_direct_${Date.now()}.png`;
    
    console.log(`📁 Имя файла: ${testFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки файла:', uploadError);
      console.log('🔍 Детали ошибки:', {
        message: uploadError.message,
        status: uploadError.status,
        statusCode: uploadError.statusCode
      });
      return;
    }

    console.log('✅ Файл успешно загружен:', uploadData.path);

    // 2. Получаем публичный URL
    console.log('\n2️⃣ Получаем публичный URL...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);

    if (urlData && urlData.publicUrl) {
      console.log('🔗 Публичный URL:', urlData.publicUrl);
      
      // 3. Тестируем доступность URL
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log(`📡 HTTP статус: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log('✅ Публичный URL доступен');
        } else {
          console.log('⚠️ Публичный URL недоступен');
        }
      } catch (error) {
        console.log('❌ Не удалось проверить публичный URL:', error.message);
      }
    } else {
      console.log('❌ Не удалось получить публичный URL');
    }

    // 4. Тестируем получение файла
    console.log('\n3️⃣ Тестируем получение файла...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('avatars')
      .download(testFileName);

    if (downloadError) {
      console.error('❌ Ошибка получения файла:', downloadError);
    } else {
      console.log('✅ Файл успешно получен');
      console.log(`📊 Размер файла: ${downloadData.size} bytes`);
    }

    // 5. Удаляем тестовый файл
    console.log('\n4️⃣ Удаляем тестовый файл...');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️ Не удалось удалить тестовый файл:', deleteError.message);
    } else {
      console.log('🗑️ Тестовый файл удален');
    }

    console.log('\n🎉 Тестирование завершено успешно!');
    console.log('💡 Bucket avatars работает через API!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testDirectUpload(); 