// Детальная диагностика проблем с доступом к Supabase Storage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStorageAccess() {
  console.log('🔍 Детальная диагностика Supabase Storage...\n');

  try {
    // 1. Проверяем подключение к Supabase
    console.log('1️⃣ Проверяем подключение к Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Ошибка подключения к Supabase:', testError);
      return;
    }
    console.log('✅ Подключение к Supabase работает');

    // 2. Проверяем список buckets
    console.log('\n2️⃣ Проверяем список buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Ошибка получения buckets:', bucketsError);
      console.log('🔍 Детали ошибки:', {
        message: bucketsError.message,
        status: bucketsError.status,
        statusCode: bucketsError.statusCode
      });
      return;
    }

    console.log('📦 Найденные buckets:');
    if (buckets.length === 0) {
      console.log('   - Нет buckets');
    } else {
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (public: ${bucket.public}, size_limit: ${bucket.file_size_limit})`);
      });
    }

    // 3. Проверяем bucket avatars
    const avatarsBucket = buckets.find(b => b.name === 'avatars');
    if (!avatarsBucket) {
      console.log('\n❌ Bucket "avatars" не найден в списке buckets');
      console.log('💡 Возможные причины:');
      console.log('   - Bucket не создан');
      console.log('   - Проблемы с правами доступа');
      console.log('   - Bucket создан, но не доступен через API');
      return;
    }

    console.log('\n✅ Bucket "avatars" найден');
    console.log(`   - Name: ${avatarsBucket.name}`);
    console.log(`   - Public: ${avatarsBucket.public}`);
    console.log(`   - File size limit: ${avatarsBucket.file_size_limit} bytes`);
    console.log(`   - Created at: ${avatarsBucket.created_at}`);

    // 4. Проверяем содержимое bucket
    console.log('\n3️⃣ Проверяем содержимое bucket avatars...');
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list();

    if (filesError) {
      console.error('❌ Ошибка получения файлов:', filesError);
      console.log('🔍 Детали ошибки:', {
        message: filesError.message,
        status: filesError.status,
        statusCode: filesError.statusCode
      });
      return;
    }

    console.log(`📁 Найдено файлов: ${files.length}`);
    if (files.length > 0) {
      console.log('📋 Список файлов:');
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
      if (files.length > 5) {
        console.log(`   ... и еще ${files.length - 5} файлов`);
      }
    }

    // 5. Тестируем получение публичного URL
    if (files.length > 0) {
      console.log('\n4️⃣ Тестируем получение публичного URL...');
      const testFile = files[0];
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFile.name);

      if (urlData && urlData.publicUrl) {
        console.log('🔗 Публичный URL получен:', urlData.publicUrl);
        
        // 6. Тестируем доступность URL
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log(`📡 HTTP статус: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            console.log('✅ Публичный URL доступен');
          } else {
            console.log('⚠️ Публичный URL недоступен');
            console.log('🔍 Возможные причины:');
            console.log('   - Проблемы с политиками доступа');
            console.log('   - Bucket не помечен как публичный');
            console.log('   - Проблемы с CDN');
          }
        } catch (error) {
          console.log('❌ Не удалось проверить публичный URL:', error.message);
        }
      } else {
        console.log('❌ Не удалось получить публичный URL');
      }
    }

    // 7. Тестируем загрузку файла
    console.log('\n5️⃣ Тестируем загрузку файла...');
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    const testFileName = `debug_test_${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки тестового файла:', uploadError);
      console.log('🔍 Детали ошибки:', {
        message: uploadError.message,
        status: uploadError.status,
        statusCode: uploadError.statusCode
      });
    } else {
      console.log('✅ Тестовый файл загружен:', uploadData.path);
      
      // Удаляем тестовый файл
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([testFileName]);
      
      if (deleteError) {
        console.log('⚠️ Не удалось удалить тестовый файл:', deleteError.message);
      } else {
        console.log('🗑️ Тестовый файл удален');
      }
    }

    console.log('\n🎉 Диагностика завершена!');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

// Запускаем диагностику
debugStorageAccess(); 