// Тестовый скрипт для проверки загрузки аватаров
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvatarUpload() {
  console.log('🧪 Тестирование загрузки аватаров...\n');

  try {
    // 1. Проверяем текущие аватары
    console.log('1️⃣ Проверяем текущие аватары...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, avatar')
      .limit(5);

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    console.log('📊 Текущие аватары:');
    players.forEach(player => {
      if (player.avatar && player.avatar.startsWith('http')) {
        console.log(`✅ ${player.name}: Storage URL`);
      } else if (player.avatar && player.avatar.startsWith('file://')) {
        console.log(`⚠️ ${player.name}: Локальный файл`);
      } else {
        console.log(`❌ ${player.name}: Нет аватара`);
      }
    });

    // 2. Создаем тестовый аватар
    console.log('\n2️⃣ Создаем тестовый аватар...');
    
    // Создаем простой тестовый файл (1x1 пиксель PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    const testFileName = `test_avatar_${Date.now()}.png`;
    
    console.log(`📁 Загружаем файл: ${testFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Ошибка загрузки:', uploadError);
      return;
    }

    console.log('✅ Файл загружен:', uploadData.path);
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);
    
    if (urlData && urlData.publicUrl) {
      console.log('🔗 Публичный URL:', urlData.publicUrl);
      
      // 3. Обновляем аватар первого игрока
      const firstPlayer = players[0];
      console.log(`\n3️⃣ Обновляем аватар игрока ${firstPlayer.name}...`);
      
      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar: urlData.publicUrl })
        .eq('id', firstPlayer.id);
      
      if (updateError) {
        console.error('❌ Ошибка обновления:', updateError);
      } else {
        console.log('✅ Аватар обновлен');
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
testAvatarUpload(); 