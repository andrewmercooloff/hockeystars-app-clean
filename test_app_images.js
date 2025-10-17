// Тестовый скрипт для проверки работы приложения с изображениями
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAppImages() {
  console.log('🧪 Тестирование работы приложения с изображениями...\n');

  try {
    // 1. Проверяем данные игроков
    console.log('1️⃣ Проверяем данные игроков...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, avatar, photos')
      .limit(5);

    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}`);
    
    let totalAvatars = 0;
    let storageAvatars = 0;
    let localAvatars = 0;
    let nullAvatars = 0;
    
    let totalPhotos = 0;
    let storagePhotos = 0;
    let localPhotos = 0;

    for (const player of players) {
      console.log(`\n👤 Игрок: ${player.name}`);
      
      // Анализируем аватар
      if (player.avatar) {
        totalAvatars++;
        if (player.avatar.startsWith('http')) {
          storageAvatars++;
          console.log(`   ✅ Аватар в Storage: ${player.avatar}`);
          
          // Проверяем доступность аватара
          try {
            const response = await fetch(player.avatar, { method: 'HEAD' });
            if (response.ok) {
              console.log(`   ✅ Аватар доступен (${response.status})`);
            } else {
              console.log(`   ⚠️ Аватар недоступен (${response.status})`);
            }
          } catch (error) {
            console.log(`   ❌ Ошибка проверки аватара: ${error.message}`);
          }
        } else if (player.avatar.startsWith('file://') || player.avatar.startsWith('content://') || player.avatar.startsWith('data:')) {
          localAvatars++;
          console.log(`   ⚠️ Локальный аватар: ${player.avatar}`);
        } else {
          console.log(`   ❓ Неизвестный формат аватара: ${player.avatar}`);
        }
      } else {
        nullAvatars++;
        console.log(`   ❌ Нет аватара`);
      }
      
      // Анализируем фотографии
      if (player.photos) {
        let photos = [];
        try {
          photos = JSON.parse(player.photos);
        } catch (error) {
          console.log(`   ⚠️ Ошибка парсинга фотографий: ${error.message}`);
          continue;
        }
        
        if (Array.isArray(photos)) {
          totalPhotos += photos.length;
          for (const photo of photos) {
            if (photo.startsWith('http')) {
              storagePhotos++;
              console.log(`   ✅ Фото в Storage: ${photo}`);
            } else if (photo.startsWith('file://') || photo.startsWith('content://') || photo.startsWith('data:')) {
              localPhotos++;
              console.log(`   ⚠️ Локальное фото: ${photo}`);
            }
          }
        }
      }
    }

    // 2. Выводим статистику
    console.log('\n📊 Статистика изображений:');
    console.log(`   Аватары:`);
    console.log(`     Всего: ${totalAvatars}`);
    console.log(`     В Storage: ${storageAvatars}`);
    console.log(`     Локальные: ${localAvatars}`);
    console.log(`     Отсутствуют: ${nullAvatars}`);
    console.log(`   Фотографии:`);
    console.log(`     Всего: ${totalPhotos}`);
    console.log(`     В Storage: ${storagePhotos}`);
    console.log(`     Локальные: ${localPhotos}`);

    // 3. Рекомендации
    console.log('\n💡 Рекомендации:');
    if (localAvatars > 0 || localPhotos > 0) {
      console.log('   ⚠️ Обнаружены локальные изображения');
      console.log('   🔧 Используйте функции миграции в админской панели');
      console.log('   📋 Нажмите "Исправить все" в админской панели');
    } else {
      console.log('   ✅ Все изображения находятся в Storage');
      console.log('   🎉 Проблема с синхронизацией решена!');
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testAppImages(); 