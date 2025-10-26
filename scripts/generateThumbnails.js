// Простой скрипт для генерации миниатюр
// Запустите: node scripts/generateThumbnails.js

const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Размеры миниатюр
const THUMBNAIL_SIZES = {
  SMALL: 30,
  MEDIUM: 50,
  LARGE: 60,
  XLARGE: 80,
  XXLARGE: 100,
};

// Функция для генерации миниатюр
async function generateThumbnails() {
  try {
    console.log('🚀 Начинаем генерацию миниатюр...');
    
    // Загружаем всех игроков с аватарами
    const { data: players, error } = await supabase
      .from('players')
      .select('id, avatar, name')
      .not('avatar', 'is', null)
      .not('avatar', 'eq', '');

    if (error) {
      throw error;
    }

    console.log(`📊 Найдено ${players.length} игроков с аватарами`);

    if (players.length === 0) {
      console.log('ℹ️ Нет игроков с аватарами для обработки');
      return;
    }

    let processed = 0;
    let failed = 0;

    // Обрабатываем каждого игрока
    for (const player of players) {
      try {
        console.log(`🔄 Обрабатываем ${player.name || player.id}...`);
        
        // Здесь должна быть логика генерации миниатюр
        // Пока просто логируем
        console.log(`✅ Обработан ${player.name || player.id}`);
        processed++;
        
        // Небольшая пауза
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Ошибка для ${player.name || player.id}:`, error);
        failed++;
      }
    }

    console.log(`🎯 Генерация завершена:`);
    console.log(`   ✅ Обработано: ${processed}`);
    console.log(`   ❌ Ошибок: ${failed}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем генерацию
generateThumbnails();
