// Тест функции updatePlayer
// Запустите: node test_update.js

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

// Функция обновления игрока (копия из playerStorage.ts)
const updatePlayer = async (id, updates) => {
  try {
    console.log('🔄 Обновляем игрока с ID:', id);
    console.log('📝 Обновления:', JSON.stringify(updates, null, 2));
    
    // Преобразуем обновления в формат Supabase
    const supabaseUpdates = {};
    
    if (updates.height) supabaseUpdates.height = parseInt(updates.height) || 0;
    if (updates.weight) supabaseUpdates.weight = parseInt(updates.weight) || 0;
    if (updates.birthDate) supabaseUpdates.birth_date = updates.birthDate;
    if (updates.hockeyStartDate) supabaseUpdates.hockey_start_date = updates.hockeyStartDate;
    if (updates.experience) supabaseUpdates.experience = parseInt(updates.experience) || 0;
    if (updates.goals) supabaseUpdates.goals = parseInt(updates.goals) || 0;
    if (updates.assists) supabaseUpdates.assists = parseInt(updates.assists) || 0;
    if (updates.games) supabaseUpdates.games = parseInt(updates.games) || 0;
    if (updates.pullUps) supabaseUpdates.pull_ups = parseInt(updates.pullUps) || 0;
    if (updates.pushUps) supabaseUpdates.push_ups = parseInt(updates.pushUps) || 0;
    if (updates.plankTime) supabaseUpdates.plank_time = parseInt(updates.plankTime) || 0;
    if (updates.sprint100m) supabaseUpdates.sprint_100m = parseFloat(updates.sprint100m) || 0;
    if (updates.longJump) supabaseUpdates.long_jump = parseInt(updates.longJump) || 0;
    if (updates.favoriteGoals !== undefined) supabaseUpdates.favorite_goals = updates.favoriteGoals;
    if (updates.photos !== undefined) supabaseUpdates.photos = updates.photos && updates.photos.length > 0 ? JSON.stringify(updates.photos) : '[]';
    if (updates.number !== undefined) supabaseUpdates.number = updates.number;
    
    // Добавляем остальные поля напрямую
    Object.assign(supabaseUpdates, {
      name: updates.name,
      position: updates.position,
      team: updates.team,
      age: updates.age,
      avatar: updates.avatar,
      email: updates.email,
      password: updates.password,
      status: updates.status,
      achievements: updates.achievements,
      phone: updates.phone,
      city: updates.city,
      country: updates.country,
      grip: updates.grip
    });
    
    console.log('📤 Отправляем в Supabase:', JSON.stringify(supabaseUpdates, null, 2));
    
    const { data, error } = await supabase
      .from('players')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка обновления игрока:', error);
      return null;
    }
    
    console.log('✅ Игрок обновлен успешно');
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка обновления игрока:', error);
    return null;
  }
};

async function testUpdate() {
  try {
    console.log('🧪 Тестируем функцию updatePlayer...\n');
    
    // Получаем первого игрока
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .limit(1);
    
    if (playersError || !players || players.length === 0) {
      console.error('❌ Не удалось получить игроков:', playersError);
      return;
    }
    
    const player = players[0];
    console.log('👤 Тестируем на игроке:', player.name);
    console.log('🆔 ID:', player.id);
    
    // Тестируем обновление
    const testUpdates = {
      number: '99',
      favoriteGoals: 'https://youtube.com/watch?v=test123\nhttps://youtube.com/watch?v=test456',
      photos: ['photo1.jpg', 'photo2.jpg'],
      height: '185',
      weight: '80'
    };
    
    console.log('\n📝 Тестовые обновления:', JSON.stringify(testUpdates, null, 2));
    
    const updatedPlayer = await updatePlayer(player.id, testUpdates);
    
    if (updatedPlayer) {
      console.log('\n✅ Результат обновления:');
      console.log(`   Номер: ${updatedPlayer.number}`);
      console.log(`   Любимые голы: ${updatedPlayer.favoriteGoals}`);
      console.log(`   Фотографии: ${JSON.stringify(updatedPlayer.photos)}`);
      console.log(`   Рост: ${updatedPlayer.height}`);
      console.log(`   Вес: ${updatedPlayer.weight}`);
    } else {
      console.log('❌ Обновление не удалось');
    }
    
    // Проверяем, что данные действительно сохранились
    console.log('\n🔍 Проверяем сохранение в базе...');
    const { data: checkData, error: checkError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player.id)
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError);
    } else {
      console.log('📋 Данные в базе:');
      console.log(`   Номер: ${checkData.number}`);
      console.log(`   Любимые голы: ${checkData.favorite_goals}`);
      console.log(`   Фотографии: ${checkData.photos}`);
      console.log(`   Рост: ${checkData.height}`);
      console.log(`   Вес: ${checkData.weight}`);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testUpdate(); 