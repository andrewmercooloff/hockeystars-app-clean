// Скрипт для проверки URL аватаров в базе данных
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseUrls() {
  console.log('🔍 Проверка URL аватаров в базе данных...\n');
  
  try {
    // Получаем всех игроков
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, avatar');
    
    if (error) {
      console.error('❌ Ошибка получения игроков:', error);
      return;
    }
    
    console.log(`📊 Найдено игроков: ${players.length}\n`);
    
    let storageCount = 0;
    let localCount = 0;
    let brokenCount = 0;
    let missingCount = 0;
    
    for (const player of players) {
      console.log(`👤 ${player.name}:`);
      
      if (!player.avatar) {
        console.log('   ❌ Нет аватара');
        missingCount++;
        continue;
      }
      
      if (player.avatar.startsWith('http')) {
        // Проверяем Storage URL
        if (player.avatar.includes('avatars//')) {
          console.log(`   ⚠️  НЕПРАВИЛЬНЫЙ URL (двойной слеш): ${player.avatar}`);
          brokenCount++;
        } else if (player.avatar.includes('avatars/')) {
          console.log(`   ✅ Storage URL: ${player.avatar}`);
          storageCount++;
        } else {
          console.log(`   ❓ Другой HTTP URL: ${player.avatar}`);
        }
      } else if (player.avatar.startsWith('file://') || player.avatar.startsWith('content://')) {
        console.log(`   📱 Локальный файл: ${player.avatar}`);
        localCount++;
      } else {
        console.log(`   ❓ Неизвестный формат: ${player.avatar}`);
      }
    }
    
    console.log('\n📈 Статистика:');
    console.log(`   ✅ В Storage: ${storageCount}`);
    console.log(`   📱 Локальные: ${localCount}`);
    console.log(`   ⚠️  Сломанные URL: ${brokenCount}`);
    console.log(`   ❌ Отсутствуют: ${missingCount}`);
    
    // Если есть сломанные URL, предлагаем исправить
    if (brokenCount > 0) {
      console.log('\n🔧 Нужно исправить сломанные URL!');
      console.log('Запустите: node fix_broken_urls.js');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запускаем проверку
checkDatabaseUrls(); 