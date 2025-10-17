// Тестовый скрипт для проверки функций миграции
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigrationFunctions() {
  console.log('🧪 Тестирование функций миграции...\n');

  try {
    // 1. Проверяем, что bucket доступен
    console.log('1️⃣ Проверяем доступность bucket...');
    
    const { data: bucketData, error: bucketError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (bucketError) {
      console.error('❌ Ошибка доступа к bucket:', bucketError);
      return;
    }
    
    console.log('✅ Bucket доступен');

    // 2. Получаем игроков с локальными аватарами
    console.log('\n2️⃣ Получаем игроков с локальными аватарами...');
    
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .limit(5);

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    const localPlayers = players.filter(p => p.avatar && p.avatar.startsWith('file://'));
    console.log(`📊 Найдено игроков с локальными аватарами: ${localPlayers.length}`);

    // 3. Пробуем создать тестовый аватар для каждого игрока
    console.log('\n3️⃣ Создаем тестовые аватары...');
    
    for (const player of localPlayers) {
      console.log(`\n👤 Обрабатываем игрока: ${player.name}`);
      
      // Создаем уникальный тестовый файл для каждого игрока
      const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testBuffer = Buffer.from(testImageData, 'base64');
      const testFileName = `migration_${player.id}_${Date.now()}.png`;
      
      console.log(`📁 Загружаем файл: ${testFileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(testFileName, testBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ Ошибка загрузки для ${player.name}:`, uploadError);
        continue;
      }

      console.log(`✅ Файл загружен: ${uploadData.path}`);
      
      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(testFileName);
      
      if (urlData && urlData.publicUrl) {
        console.log(`🔗 Публичный URL: ${urlData.publicUrl}`);
        
        // Обновляем аватар игрока
        console.log(`🔄 Обновляем аватар игрока ${player.name}...`);
        
        const { error: updateError } = await supabase
          .from('players')
          .update({ avatar: urlData.publicUrl })
          .eq('id', player.id);
        
        if (updateError) {
          console.error(`❌ Ошибка обновления для ${player.name}:`, updateError);
        } else {
          console.log(`✅ Аватар игрока ${player.name} обновлен`);
        }
      }
    }

    // 4. Проверяем результат
    console.log('\n4️⃣ Проверяем результат...');
    
    const { data: updatedPlayers, error: updatedError } = await supabase
      .from('players')
      .select('name, avatar')
      .limit(5);

    if (updatedError) {
      console.error('❌ Ошибка получения обновленных данных:', updatedError);
    } else {
      console.log('📊 Результат обновления:');
      updatedPlayers.forEach(player => {
        if (player.avatar && player.avatar.startsWith('http')) {
          console.log(`✅ ${player.name}: Storage URL`);
        } else if (player.avatar && player.avatar.startsWith('file://')) {
          console.log(`⚠️ ${player.name}: Локальный файл`);
        } else {
          console.log(`❌ ${player.name}: Нет аватара`);
        }
      });
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testMigrationFunctions(); 