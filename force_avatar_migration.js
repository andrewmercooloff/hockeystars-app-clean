// Принудительная миграция аватаров в Storage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceAvatarMigration() {
  console.log('🔄 Принудительная миграция аватаров...\n');

  try {
    // 1. Получаем всех игроков
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, avatar');

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}`);

    // 2. Проверяем каждого игрока
    for (const player of players) {
      console.log(`\n👤 Обрабатываем: ${player.name}`);
      
      if (!player.avatar) {
        console.log('   ❌ Нет аватара');
        continue;
      }

      if (player.avatar.startsWith('http')) {
        console.log('   ✅ Уже в Storage');
        continue;
      }

      if (player.avatar.startsWith('file://') || player.avatar.startsWith('content://')) {
        console.log('   ⚠️ Локальный файл - создаем новый аватар');
        
        // Создаем новый аватар в Storage
        const timestamp = Date.now();
        const fileName = `migration_${player.id}_${timestamp}.png`;
        
        // Создаем простой цветной аватар (синий)
        const avatarData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const avatarBuffer = Buffer.from(avatarData, 'base64');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error(`   ❌ Ошибка загрузки:`, uploadError);
          continue;
        }

        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        if (urlData && urlData.publicUrl) {
          // Обновляем аватар в базе данных
          const { error: updateError } = await supabase
            .from('players')
            .update({ avatar: urlData.publicUrl })
            .eq('id', player.id);

          if (updateError) {
            console.error(`   ❌ Ошибка обновления:`, updateError);
          } else {
            console.log(`   ✅ Аватар обновлен: ${urlData.publicUrl}`);
          }
        }
      } else {
        console.log('   ❓ Неизвестный формат аватара');
      }
    }

    // 3. Финальная проверка
    console.log('\n📊 Финальная проверка...');
    const { data: finalPlayers, error: finalError } = await supabase
      .from('players')
      .select('name, avatar');

    if (!finalError) {
      let storageCount = 0;
      let localCount = 0;
      let missingCount = 0;

      finalPlayers.forEach(player => {
        if (player.avatar && player.avatar.startsWith('http')) {
          storageCount++;
        } else if (player.avatar && (player.avatar.startsWith('file://') || player.avatar.startsWith('content://'))) {
          localCount++;
        } else {
          missingCount++;
        }
      });

      console.log(`📈 Результат миграции:`);
      console.log(`   ✅ В Storage: ${storageCount}`);
      console.log(`   ⚠️ Локальные: ${localCount}`);
      console.log(`   ❌ Отсутствуют: ${missingCount}`);
    }

    console.log('\n🎉 Миграция завершена!');

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  }
}

// Запускаем миграцию
forceAvatarMigration(); 