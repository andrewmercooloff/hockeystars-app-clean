const { createClient } = require('@supabase/supabase-js');

// Замените на ваши реальные ключи
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔧 Тестирование подключения к Supabase...');
  
  try {
    // Тест 1: Проверка подключения
    console.log('📡 Проверка подключения...');
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error.message);
      return false;
    }
    
    console.log('✅ Подключение успешно!');
    
    // Тест 2: Создание тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    const testPlayer = {
      name: 'Тестовый Игрок',
      position: 'Нападающий',
      team: 'Тестовая Команда',
      age: 25,
      height: '180 см',
      weight: '80 кг',
      email: 'test@example.com',
      password: 'test123',
      status: 'user',
      city: 'Минск'
    };
    
    const { data: newPlayer, error: insertError } = await supabase
      .from('players')
      .insert([testPlayer])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Ошибка создания пользователя:', insertError.message);
      return false;
    }
    
    console.log('✅ Тестовый пользователь создан:', newPlayer.name);
    
    // Тест 3: Получение всех пользователей
    console.log('📊 Получение всех пользователей...');
    const { data: players, error: selectError } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (selectError) {
      console.error('❌ Ошибка получения пользователей:', selectError.message);
      return false;
    }
    
    console.log('✅ Пользователи получены:', players.length);
    players.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (${player.email})`);
    });
    
    // Тест 4: Удаление тестового пользователя
    console.log('🗑️ Удаление тестового пользователя...');
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('email', 'test@example.com');
    
    if (deleteError) {
      console.error('❌ Ошибка удаления пользователя:', deleteError.message);
      return false;
    }
    
    console.log('✅ Тестовый пользователь удален');
    
    console.log('🎉 Все тесты пройдены успешно!');
    return true;
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
    return false;
  }
}

// Запуск теста
if (require.main === module) {
  testConnection().then(success => {
    if (success) {
      console.log('🚀 Supabase готов к использованию!');
      process.exit(0);
    } else {
      console.log('💥 Тестирование не прошло');
      process.exit(1);
    }
  });
}

module.exports = { testConnection }; 