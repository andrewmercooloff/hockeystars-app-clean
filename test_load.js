// Тест функции loadPlayers
// Запустите: node test_load.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Функция преобразования данных (копия из playerStorage.ts)
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
    favoriteGoals: supabasePlayer.favorite_goals || '',
    photos: supabasePlayer.photos && supabasePlayer.photos !== '[]' ? 
      (() => {
        try {
          return JSON.parse(supabasePlayer.photos);
        } catch (error) {
          console.error('Ошибка парсинга photos:', error);
          return [];
        }
      })() : [],
    number: supabasePlayer.number || '',
    unreadNotificationsCount: 0,
    unreadMessagesCount: 0
  };
};

// Функция загрузки игроков (копия из playerStorage.ts)
const loadPlayers = async () => {
  try {
    console.log('🔄 Загружаем игроков из базы данных...');
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка загрузки игроков:', error);
      return [];
    }
    
    console.log(`✅ Загружено игроков: ${data?.length || 0}`);
    
    // Преобразуем данные из Supabase в формат приложения
    const players = (data || []).map(convertSupabaseToPlayer);
    
    console.log('📋 Преобразованные данные:');
    players.forEach((player, index) => {
      console.log(`\n👤 Игрок ${index + 1}:`);
      console.log(`   ID: ${player.id}`);
      console.log(`   Имя: ${player.name}`);
      console.log(`   Аватар: ${player.avatar || 'не установлен'}`);
      console.log(`   Номер: ${player.number || 'не установлен'}`);
      console.log(`   Любимые голы: ${player.favoriteGoals || 'не установлены'}`);
      console.log(`   Фотографии: ${JSON.stringify(player.photos)}`);
      console.log(`   Рост: ${player.height}`);
      console.log(`   Вес: ${player.weight}`);
    });
    
    return players;
  } catch (error) {
    console.error('❌ Ошибка загрузки игроков:', error);
    return [];
  }
};

async function testLoad() {
  try {
    console.log('🧪 Тестируем функцию loadPlayers...\n');
    
    const players = await loadPlayers();
    
    console.log(`\n📊 Итого загружено игроков: ${players.length}`);
    
    // Проверяем, есть ли игрок с обновленными данными
    const updatedPlayer = players.find(p => p.number === '99');
    if (updatedPlayer) {
      console.log('\n✅ Найден игрок с обновленными данными:');
      console.log(`   Имя: ${updatedPlayer.name}`);
      console.log(`   Номер: ${updatedPlayer.number}`);
      console.log(`   Любимые голы: ${updatedPlayer.favoriteGoals}`);
      console.log(`   Фотографии: ${JSON.stringify(updatedPlayer.photos)}`);
    } else {
      console.log('\n❌ Игрок с обновленными данными не найден');
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testLoad(); 