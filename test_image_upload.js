// Тестовый скрипт для проверки загрузки изображений в Supabase Storage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageSetup() {
  console.log('🔍 Тестирование настройки Supabase Storage...\n');

  try {
    // 1. Проверяем список buckets
    console.log('1️⃣ Проверяем список buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Ошибка получения buckets:', bucketsError);
      return;
    }

    console.log('📦 Найденные buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`);
    });

    // 2. Проверяем bucket avatars
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    if (!avatarsBucket) {
      console.log('\n❌ Bucket "avatars" не найден!');
      console.log('💡 Выполните SQL скрипт: database/fix_storage_policies.sql');
      return;
    }

    console.log('\n✅ Bucket "avatars" найден');
    console.log(`   - Public: ${avatarsBucket.public}`);
    console.log(`   - File size limit: ${avatarsBucket.file_size_limit} bytes`);

    // 3. Проверяем содержимое bucket
    console.log('\n2️⃣ Проверяем содержимое bucket avatars...');
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list();

    if (filesError) {
      console.error('❌ Ошибка получения файлов:', filesError);
      return;
    }

    console.log(`📁 Найдено файлов: ${files.length}`);
    if (files.length > 0) {
      console.log('📋 Список файлов:');
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
    }

    // 4. Тестируем загрузку простого файла
    console.log('\n3️⃣ Тестируем загрузку файла...');
    
    // Создаем простой тестовый файл (1x1 пиксель PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    
    const testFileName = `test_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки тестового файла:', uploadError);
      return;
    }

    console.log('✅ Тестовый файл загружен:', uploadData.path);

    // 5. Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);

    if (urlData && urlData.publicUrl) {
      console.log('🔗 Публичный URL:', urlData.publicUrl);
      
      // 6. Тестируем доступность URL
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Публичный URL доступен');
        } else {
          console.log(`⚠️ Публичный URL недоступен, код: ${response.status}`);
        }
      } catch (error) {
        console.log('⚠️ Не удалось проверить публичный URL:', error.message);
      }
    }

    // 7. Удаляем тестовый файл
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️ Не удалось удалить тестовый файл:', deleteError);
    } else {
      console.log('🗑️ Тестовый файл удален');
    }

    console.log('\n🎉 Тестирование завершено успешно!');
    console.log('💡 Теперь можно использовать функции миграции в приложении');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testStorageSetup(); 