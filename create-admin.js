const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  console.log('👑 Создание администратора в Supabase...');
  
  try {
    // Проверяем, есть ли уже администратор
    const { data: existingAdmin, error: checkError } = await supabase
      .from('players')
      .select('*')
      .eq('email', 'admin@hockeystars.com')
      .single();
    
    if (existingAdmin) {
      console.log('✅ Администратор уже существует:', existingAdmin.name);
      console.log('📧 Email: admin@hockeystars.com');
      console.log('🔑 Пароль: admin123');
      return existingAdmin;
    }
    
    // Создаем нового администратора
    const adminData = {
      name: 'Администратор',
      position: 'Администратор',
      team: 'Система',
      age: 30,
      height: 180,
      weight: 80,
      email: 'admin@hockeystars.com',
      password: 'admin123',
      status: 'admin',
      city: 'Минск',
      goals: 0,
      assists: 0,
      games: 0,
      pull_ups: 0,
      push_ups: 0,
      plank_time: 0,
      sprint_100m: 0,
      long_jump: 0
    };
    
    const { data: newAdmin, error: insertError } = await supabase
      .from('players')
      .insert([adminData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Ошибка создания администратора:', insertError.message);
      return null;
    }
    
    console.log('✅ Администратор создан успешно!');
    console.log('👤 Имя:', newAdmin.name);
    console.log('📧 Email: admin@hockeystars.com');
    console.log('🔑 Пароль: admin123');
    console.log('🆔 ID:', newAdmin.id);
    
    return newAdmin;
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
    return null;
  }
}

// Запуск создания администратора
if (require.main === module) {
  createAdmin().then(admin => {
    if (admin) {
      console.log('🚀 Администратор готов к использованию!');
      process.exit(0);
    } else {
      console.log('💥 Не удалось создать администратора');
      process.exit(1);
    }
  });
}

module.exports = { createAdmin }; 