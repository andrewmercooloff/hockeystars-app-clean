// Тестовый скрипт для отладки процесса миграции
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigrationDebug() {
  console.log('🧪 Тестирование отладки миграции...\n');

  try {
    // 1. Получаем данные игроков
    console.log('1️⃣ Получаем данные игроков...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .limit(5);

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}`);

    // 2. Анализируем каждого игрока
    for (const player of players) {
      console.log(`\n👤 Игрок: ${player.name}`);
      console.log(`   ID: ${player.id}`);
      console.log(`   Аватар: ${player.avatar || 'Нет'}`);
      
      if (player.avatar) {
        if (player.avatar.startsWith('file://')) {
          console.log(`   ⚠️ Локальный аватар: ${player.avatar}`);
          
          // Пробуем прочитать файл (это не сработает, но покажет ошибку)
          try {
            const fs = require('fs');
            const path = player.avatar.replace('file://', '');
            console.log(`   🔍 Пытаемся прочитать: ${path}`);
            
            if (fs.existsSync(path)) {
              const stats = fs.statSync(path);
              console.log(`   ✅ Файл существует, размер: ${stats.size} bytes`);
            } else {
              console.log(`   ❌ Файл не существует`);
            }
          } catch (error) {
            console.log(`   ❌ Ошибка доступа к файлу: ${error.message}`);
          }
        } else if (player.avatar.startsWith('http')) {
          console.log(`   ✅ Storage аватар: ${player.avatar}`);
        }
      }
      
      // Анализируем фотографии
      if (player.photos) {
        console.log(`   Фотографии: ${player.photos}`);
        try {
          const photos = JSON.parse(player.photos);
          if (Array.isArray(photos)) {
            console.log(`   📸 Количество фото: ${photos.length}`);
            photos.forEach((photo, index) => {
              if (photo.startsWith('file://')) {
                console.log(`     ⚠️ Локальное фото ${index + 1}: ${photo}`);
              } else if (photo.startsWith('http')) {
                console.log(`     ✅ Storage фото ${index + 1}: ${photo}`);
              }
            });
          }
        } catch (error) {
          console.log(`   ❌ Ошибка парсинга фотографий: ${error.message}`);
        }
      }
    }

    // 3. Пробуем создать тестовый файл и загрузить его
    console.log('\n2️⃣ Тестируем загрузку файла...');
    
    // Создаем простой тестовый файл
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    const testFileName = `test_migration_${Date.now()}.png`;
    
    console.log(`📁 Загружаем тестовый файл: ${testFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки:', uploadError);
    } else {
      console.log('✅ Тестовый файл загружен:', uploadData.path);
      
      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      if (urlData && urlData.publicUrl) {
        console.log('🔗 Публичный URL:', urlData.publicUrl);
        
        // Обновляем аватар первого игрока на тестовый
        const firstPlayer = players[0];
        console.log(`\n3️⃣ Обновляем аватар игрока ${firstPlayer.name}...`);
        
        const { error: updateError } = await supabase
          .from('players')
          .update({ avatar: urlData.publicUrl })
          .eq('id', firstPlayer.id);
        
        if (updateError) {
          console.error('❌ Ошибка обновления:', updateError);
        } else {
          console.log('✅ Аватар обновлен на Storage URL');
        }
      }
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testMigrationDebug(); 