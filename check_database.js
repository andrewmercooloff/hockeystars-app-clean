const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase (замените на ваши данные)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Проверка данных в базе данных...\n');

  try {
    // Получаем всех игроков
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Ошибка получения игроков:', error);
      return;
    }

    console.log(`📊 Найдено игроков: ${players.length}\n`);

    // Проверяем каждого игрока
    players.forEach((player, index) => {
      console.log(`\n--- Игрок ${index + 1}: ${player.name} ---`);
      console.log('ID:', player.id);
      console.log('Статус:', player.status);
      
      // Проверяем дату начала хоккея
      console.log('\n🏒 Хоккейные данные:');
      console.log('   hockey_start_date (в БД):', player.hockey_start_date);
      console.log('   hockey_start_date тип:', typeof player.hockey_start_date);
      
      // Проверяем нормативы
      console.log('\n📊 Нормативы (в БД):');
      console.log('   pull_ups:', player.pull_ups, '(тип:', typeof player.pull_ups, ')');
      console.log('   push_ups:', player.push_ups, '(тип:', typeof player.push_ups, ')');
      console.log('   plank_time:', player.plank_time, '(тип:', typeof player.plank_time, ')');
      console.log('   sprint_100m:', player.sprint_100m, '(тип:', typeof player.sprint_100m, ')');
      console.log('   long_jump:', player.long_jump, '(тип:', typeof player.long_jump, ')');
      console.log('   jump_rope:', player.jump_rope, '(тип:', typeof player.jump_rope, ')');
      
      // Проверяем видео
      console.log('\n🎥 Видео моментов (в БД):');
      console.log('   favorite_goals:', player.favorite_goals, '(тип:', typeof player.favorite_goals, ')');
      if (player.favorite_goals) {
        console.log('   favorite_goals.length:', player.favorite_goals.length);
        console.log('   favorite_goals.trim():', player.favorite_goals.trim());
        console.log('   favorite_goals !== "":', player.favorite_goals.trim() !== '');
      }
      
      console.log('\n' + '='.repeat(50));
    });

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запускаем проверку
checkDatabase(); 