const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminEdit() {
  try {
    console.log('🧪 Тестирование редактирования игрока администратором...');
    
    // 1. Найдем игрока для редактирования
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .limit(1);
    
    if (playersError) {
      console.error('❌ Ошибка загрузки игроков:', playersError);
      return;
    }
    
    if (!players || players.length === 0) {
      console.log('❌ Нет игроков для редактирования');
      return;
    }
    
    const player = players[0];
    console.log('✅ Найден игрок для редактирования:', player.name);
    
    // 2. Обновим данные игрока
    const updates = {
      name: player.name + ' (отредактировано)',
      number: '99',
      position: 'Нападающий',
      team: 'Динамо Минск',
      height: '180',
      weight: '80',
      pull_ups: '15',
      push_ups: '30',
      plank_time: '60',
      sprint_100m: '12.5',
      long_jump: '250',
      favorite_goals: '["https://youtube.com/watch?v=test1", "https://youtube.com/watch?v=test2"]',
      photos: '["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]'
    };
    
    console.log('📝 Обновляем данные игрока...');
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updates)
      .eq('id', player.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Ошибка обновления игрока:', updateError);
      return;
    }
    
    console.log('✅ Игрок успешно обновлен!');
    console.log('📊 Обновленные данные:');
    console.log('- Имя:', updatedPlayer.name);
    console.log('- Номер:', updatedPlayer.number);
    console.log('- Позиция:', updatedPlayer.position);
    console.log('- Команда:', updatedPlayer.team);
    console.log('- Рост:', updatedPlayer.height);
    console.log('- Вес:', updatedPlayer.weight);
    console.log('- Подтягивания:', updatedPlayer.pull_ups);
    console.log('- Отжимания:', updatedPlayer.push_ups);
    console.log('- Планка:', updatedPlayer.plank_time);
    console.log('- 100м:', updatedPlayer.sprint_100m);
    console.log('- Прыжок:', updatedPlayer.long_jump);
    console.log('- Любимые голы:', updatedPlayer.favorite_goals);
    console.log('- Фотографии:', updatedPlayer.photos);
    
    // 3. Проверим, что данные сохранились
    const { data: checkPlayer, error: checkError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player.id)
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки данных:', checkError);
      return;
    }
    
    console.log('✅ Данные успешно сохранены в базе данных!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testAdminEdit(); 