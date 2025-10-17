const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Функция преобразования данных из Supabase в формат приложения
const convertSupabaseToPlayer = (supabasePlayer) => {
  return {
    id: supabasePlayer.id,
    name: supabasePlayer.name,
    position: supabasePlayer.position,
    team: supabasePlayer.team,
    age: supabasePlayer.age,
    height: supabasePlayer.height ? `${supabasePlayer.height} см` : '',
    weight: supabasePlayer.weight ? `${supabasePlayer.weight} кг` : '',
    avatar: supabasePlayer.avatar,
    email: supabasePlayer.email,
    password: supabasePlayer.password,
    status: supabasePlayer.status,
    birthDate: supabasePlayer.birth_date,
    hockeyStartDate: supabasePlayer.hockey_start_date,
    experience: supabasePlayer.experience ? supabasePlayer.experience.toString() : '',
    achievements: supabasePlayer.achievements,
    phone: supabasePlayer.phone,
    city: supabasePlayer.city,
    goals: supabasePlayer.goals ? supabasePlayer.goals.toString() : '0',
    assists: supabasePlayer.assists ? supabasePlayer.assists.toString() : '0',
    country: supabasePlayer.country,
    grip: supabasePlayer.grip,
    games: supabasePlayer.games ? supabasePlayer.games.toString() : '0',
    pullUps: supabasePlayer.pull_ups ? supabasePlayer.pull_ups.toString() : '0',
    pushUps: supabasePlayer.push_ups ? supabasePlayer.push_ups.toString() : '0',
    plankTime: supabasePlayer.plank_time ? supabasePlayer.plank_time.toString() : '0',
    sprint100m: supabasePlayer.sprint_100m ? supabasePlayer.sprint_100m.toString() : '0',
    longJump: supabasePlayer.long_jump ? supabasePlayer.long_jump.toString() : '0',
    unreadNotificationsCount: 0,
    unreadMessagesCount: 0
  };
};

async function testAdminLogin() {
  console.log('🔧 Тестирование входа администратора...');
  
  try {
    // Поиск администратора по email и паролю
    console.log('🔍 Поиск администратора...');
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('email', 'admin@hockeystars.com')
      .eq('password', 'admin123')
      .single();
    
    if (error) {
      console.error('❌ Ошибка поиска администратора:', error.message);
      return false;
    }
    
    if (!data) {
      console.error('❌ Администратор не найден');
      return false;
    }
    
    console.log('✅ Администратор найден в базе данных');
    console.log('👤 Имя:', data.name);
    console.log('📧 Email:', data.email);
    console.log('🔑 Статус:', data.status);
    
    // Преобразуем данные в формат приложения
    const player = convertSupabaseToPlayer(data);
    
    console.log('🔄 Преобразование данных...');
    console.log('✅ Преобразованные данные:');
    console.log('  - ID:', player.id);
    console.log('  - Имя:', player.name);
    console.log('  - Email:', player.email);
    console.log('  - Статус:', player.status);
    console.log('  - Рост:', player.height);
    console.log('  - Вес:', player.weight);
    console.log('  - Голы:', player.goals);
    console.log('  - Передачи:', player.assists);
    
    // Проверяем, что статус правильный
    if (player.status === 'admin') {
      console.log('✅ Статус администратора корректный');
    } else {
      console.log('❌ Неправильный статус:', player.status);
      return false;
    }
    
    console.log('🎉 Тест входа администратора прошел успешно!');
    console.log('📋 Данные готовы для сохранения в AsyncStorage');
    
    return true;
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
    return false;
  }
}

// Запуск теста
if (require.main === module) {
  testAdminLogin().then(success => {
    if (success) {
      console.log('🚀 Администратор готов к входу в приложение!');
      process.exit(0);
    } else {
      console.log('💥 Тест входа не прошел');
      process.exit(1);
    }
  });
}

module.exports = { testAdminLogin }; 