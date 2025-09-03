// Тест для проверки исправлений
// Запустите: node test_fixes.js

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
    height: supabasePlayer.height ? supabasePlayer.height.toString() : '',
    weight: supabasePlayer.weight ? supabasePlayer.weight.toString() : '',
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

async function testFixes() {
  try {
    console.log('🧪 Тестируем исправления...\n');
    
    // 1. Тестируем исправление дублирования единиц измерения
    console.log('1️⃣ Тестируем исправление дублирования единиц измерения...');
    
    const testSupabasePlayer = {
      id: 'test-id',
      name: 'Тестовый Игрок',
      position: 'Нападающий',
      team: 'Тест',
      age: 20,
      height: 180,
      weight: 80,
      avatar: 'test',
      email: 'test@example.com',
      password: 'test123',
      status: 'player',
      birth_date: '2000-01-01',
      hockey_start_date: null,
      experience: 5,
      achievements: '',
      phone: '',
      city: '',
      goals: 10,
      assists: 15,
      country: 'Беларусь',
      grip: 'Левый',
      games: 50,
      pull_ups: 20,
      push_ups: 30,
      plank_time: 60,
      sprint_100m: 12.5,
      long_jump: 250,
      favorite_goals: '',
      photos: '[]',
      number: '99',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };
    
    const convertedPlayer = convertSupabaseToPlayer(testSupabasePlayer);
    console.log('✅ Преобразование успешно:');
    console.log(`   Рост: "${convertedPlayer.height}" (должно быть "180", а не "180 см")`);
    console.log(`   Вес: "${convertedPlayer.weight}" (должно быть "80", а не "80 кг")`);
    console.log(`   Номер: "${convertedPlayer.number}" (должно быть "99")`);
    
    // 2. Тестируем добавление игрока с номером
    console.log('\n2️⃣ Тестируем добавление игрока с номером...');
    
    const testPlayerData = {
      name: 'Тестовый Игрок с Номером',
      position: 'Нападающий',
      team: 'Тест',
      age: 20,
      height: 180,
      weight: 80,
      avatar: 'test',
      email: 'testnumber@example.com',
      password: 'test123',
      status: 'player',
      birth_date: '2000-01-01',
      experience: 0,
      achievements: '',
      phone: '',
      city: '',
      goals: 0,
      assists: 0,
      country: 'Беларусь',
      grip: '',
      games: 0,
      pull_ups: 0,
      push_ups: 0,
      plank_time: 0,
      sprint_100m: 0,
      long_jump: 0,
      favorite_goals: '',
      photos: '[]',
      number: '88' // Тестируем номер
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('players')
      .insert([testPlayerData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Ошибка добавления игрока с номером:', insertError);
    } else {
      console.log('✅ Игрок с номером успешно добавлен:');
      console.log(`   ID: ${insertData.id}`);
      console.log(`   Имя: ${insertData.name}`);
      console.log(`   Номер: "${insertData.number}"`);
      
      // Проверяем преобразование
      const convertedTestPlayer = convertSupabaseToPlayer(insertData);
      console.log(`   Номер после преобразования: "${convertedTestPlayer.number}"`);
      
      // Удаляем тестового игрока
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.error('❌ Ошибка удаления:', deleteError);
      } else {
        console.log('✅ Тестовый игрок удален');
      }
    }
    
    // 3. Проверяем существующих игроков на наличие номеров
    console.log('\n3️⃣ Проверяем существующих игроков на наличие номеров...');
    
    const { data: existingPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id, name, number, height, weight')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Ошибка получения игроков:', fetchError);
    } else {
      console.log('📋 Существующие игроки:');
      existingPlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}`);
        console.log(`   ID: ${player.id}`);
        console.log(`   Номер: "${player.number || 'не указан'}"`);
        console.log(`   Рост: ${player.height} (в базе)`);
        console.log(`   Вес: ${player.weight} (в базе)`);
        
        // Тестируем преобразование
        const converted = convertSupabaseToPlayer(player);
        console.log(`   Рост после преобразования: "${converted.height}"`);
        console.log(`   Вес после преобразования: "${converted.weight}"`);
        console.log('');
      });
    }
    
    console.log('✅ Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Общая ошибка тестирования:', error);
  }
}

testFixes(); 