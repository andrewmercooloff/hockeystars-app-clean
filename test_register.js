// Тест для диагностики проблемы регистрации
// Запустите: node test_register.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Функция преобразования данных (копия из playerStorage.ts)
const convertPlayerToSupabase = (player) => {
  return {
    name: player.name,
    position: player.position,
    team: player.team,
    age: player.age,
    height: parseInt(player.height) || 0,
    weight: parseInt(player.weight) || 0,
    avatar: player.avatar,
    email: player.email,
    password: player.password,
    status: player.status,
    birth_date: player.birthDate,
    hockey_start_date: player.hockeyStartDate,
    experience: player.experience ? parseInt(player.experience) : 0,
    achievements: player.achievements,
    phone: player.phone,
    city: player.city,
    goals: player.goals ? parseInt(player.goals) : 0,
    assists: player.assists ? parseInt(player.assists) : 0,
    country: player.country,
    grip: player.grip,
    games: player.games ? parseInt(player.games) : 0,
    pull_ups: player.pullUps ? parseInt(player.pullUps) : 0,
    push_ups: player.pushUps ? parseInt(player.pushUps) : 0,
    plank_time: player.plankTime ? parseInt(player.plankTime) : 0,
    sprint_100m: player.sprint100m ? parseFloat(player.sprint100m) : 0,
    long_jump: player.longJump ? parseInt(player.longJump) : 0,
    favorite_goals: player.favoriteGoals || '',
    photos: player.photos && player.photos.length > 0 ? JSON.stringify(player.photos) : '[]',
    number: player.number || ''
  };
};

async function testRegister() {
  try {
    console.log('🧪 Тестируем регистрацию нового игрока...\n');
    
    // Тестовые данные игрока (как в register.tsx)
    const testPlayer = {
      email: 'test@example.com',
      password: 'test123',
      name: 'Тестовый Игрок',
      status: 'player',
      birthDate: '2008-01-01',
      country: 'Беларусь',
      team: 'Пираньи',
      position: 'Нападающий',
      grip: 'Левый',
      height: '', // Пустая строка - это может быть проблемой
      weight: '', // Пустая строка - это может быть проблемой
      avatar: 'new_player',
      age: 0
    };
    
    console.log('📝 Тестовые данные игрока:');
    console.log(JSON.stringify(testPlayer, null, 2));
    
    // Тестируем преобразование
    console.log('\n🔄 Тестируем преобразование данных...');
    try {
      const supabaseData = convertPlayerToSupabase(testPlayer);
      console.log('✅ Преобразование успешно:');
      console.log(JSON.stringify(supabaseData, null, 2));
    } catch (error) {
      console.error('❌ Ошибка преобразования:', error);
      return;
    }
    
    // Тестируем добавление в базу данных
    console.log('\n📤 Тестируем добавление в базу данных...');
    try {
      const supabaseData = convertPlayerToSupabase(testPlayer);
      
      const { data, error } = await supabase
        .from('players')
        .insert([supabaseData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Ошибка добавления в базу:', error);
        console.error('Детали ошибки:', error.message);
        console.error('Код ошибки:', error.code);
        console.error('Детали:', error.details);
        console.error('Подсказка:', error.hint);
      } else {
        console.log('✅ Игрок успешно добавлен:');
        console.log(`   ID: ${data.id}`);
        console.log(`   Имя: ${data.name}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Статус: ${data.status}`);
        
        // Удаляем тестового игрока
        console.log('\n🗑️ Удаляем тестового игрока...');
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) {
          console.error('❌ Ошибка удаления:', deleteError);
        } else {
          console.log('✅ Тестовый игрок удален');
        }
      }
    } catch (error) {
      console.error('❌ Общая ошибка добавления:', error);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка тестирования:', error);
  }
}

testRegister(); 