// Проверка существующих пользователей
// Запустите: node check_existing_users.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingUsers() {
  try {
    console.log('🔍 Проверяем существующих пользователей...\n');
    
    // Получаем всех пользователей
    const { data: users, error } = await supabase
      .from('players')
      .select('id, name, email, status, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка получения пользователей:', error);
      return;
    }
    
    console.log(`✅ Найдено пользователей: ${users.length}\n`);
    
    if (users.length > 0) {
      console.log('📋 Список пользователей:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.status}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Создан: ${user.created_at}`);
        console.log('');
      });
      
      // Проверяем уникальность email
      const emails = users.map(u => u.email).filter(Boolean);
      const uniqueEmails = [...new Set(emails)];
      
      if (emails.length !== uniqueEmails.length) {
        console.log('⚠️ Обнаружены дублирующиеся email:');
        const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
        console.log('Дубликаты:', [...new Set(duplicates)]);
      } else {
        console.log('✅ Все email уникальны');
      }
    } else {
      console.log('📝 Пользователей не найдено');
    }
    
    // Проверяем ограничения базы данных
    console.log('\n🔧 Проверяем ограничения базы данных...');
    
    // Попробуем добавить пользователя с существующим email
    const testEmail = users.length > 0 ? users[0].email : 'test@example.com';
    console.log(`Тестируем добавление пользователя с email: ${testEmail}`);
    
    const testUser = {
      name: 'Тестовый Пользователь',
      position: 'Нападающий',
      team: 'Тест',
      age: 20,
      height: 180,
      weight: 80,
      avatar: 'test',
      email: testEmail,
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
      number: ''
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('players')
      .insert([testUser])
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Ожидаемая ошибка при дублировании email:');
      console.log(`   Код: ${insertError.code}`);
      console.log(`   Сообщение: ${insertError.message}`);
      
      if (insertError.code === '23505') {
        console.log('✅ Ограничение уникальности email работает правильно');
      }
    } else {
      console.log('⚠️ Неожиданно удалось добавить пользователя с дублирующимся email');
      console.log('Добавлен пользователь:', insertData.name);
      
      // Удаляем тестового пользователя
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.error('❌ Ошибка удаления тестового пользователя:', deleteError);
      } else {
        console.log('✅ Тестовый пользователь удален');
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkExistingUsers(); 