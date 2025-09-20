const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPlayerData() {
  try {
    console.log('🧪 Проверяем данные игроков в базе...');
    
    // Получаем всех игроков
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*');
    
    if (playersError) {
      console.error('❌ Ошибка загрузки игроков:', playersError);
      return;
    }
    
    console.log(`✅ Найдено игроков: ${players.length}`);
    
    // Ищем игрока с именем Petr Merkulov
    const petr = players.find(p => p.name && p.name.toLowerCase().includes('petr'));
    
    if (petr) {
      console.log('🎯 Найден игрок Petr:');
      console.log('- ID:', petr.id);
      console.log('- Имя:', petr.name);
      console.log('- Email:', petr.email);
      console.log('- Статус:', petr.status);
      console.log('- Позиция:', petr.position);
      console.log('- Команда:', petr.team);
      console.log('- Страна:', petr.country);
      console.log('- Хват:', petr.grip);
      console.log('- Дата рождения:', petr.birth_date);
      console.log('- Дата начала хоккея:', petr.hockey_start_date);
      console.log('- Рост:', petr.height);
      console.log('- Вес:', petr.weight);
      console.log('- Номер:', petr.number);
      console.log('- Подтягивания:', petr.pull_ups);
      console.log('- Отжимания:', petr.push_ups);
      console.log('- Планка:', petr.plank_time);
      console.log('- 100м:', petr.sprint_100m);
      console.log('- Прыжок:', petr.long_jump);
      console.log('- Любимые голы:', petr.favorite_goals);
      console.log('- Фотографии:', petr.photos);
      console.log('- Аватар:', petr.avatar ? 'Есть' : 'Нет');
    } else {
      console.log('❌ Игрок Petr не найден');
    }
    
    // Показываем всех игроков
    console.log('\n📋 Все игроки в базе:');
    players.forEach((player, index) => {
      console.log(`${index + 1}. ${player.name} (${player.email}) - ${player.status}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testPlayerData(); 