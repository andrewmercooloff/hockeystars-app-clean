const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase (используем те же ключи, что и в приложении)
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateAdminLogin() {
  try {
    console.log('🔍 Поиск администратора с email admin@hockeystars.com...');
    
    // Сначала найдем администратора со старым email
    const { data: admin, error: findError } = await supabase
      .from('players')
      .select('*')
      .eq('email', 'admin@hockeystars.com')
      .eq('status', 'admin')
      .single();
    
    if (findError) {
      console.error('❌ Ошибка поиска администратора:', findError);
      return;
    }
    
    if (!admin) {
      console.log('❌ Администратор с email admin@hockeystars.com не найден');
      
      // Проверим, есть ли администратор с email 'admin'
      const { data: existingAdmin, error: checkError } = await supabase
        .from('players')
        .select('*')
        .eq('email', 'admin')
        .eq('status', 'admin')
        .single();
      
      if (existingAdmin) {
        console.log('✅ Администратор с email "admin" уже существует');
        console.log('👤 ID:', existingAdmin.id);
        console.log('👤 Имя:', existingAdmin.name);
        console.log('👤 Email:', existingAdmin.email);
        return;
      }
      
      console.log('ℹ️ Администратор не найден. Возможно, его нужно создать.');
      return;
    }
    
    console.log('✅ Администратор найден:');
    console.log('👤 ID:', admin.id);
    console.log('👤 Имя:', admin.name);
    console.log('👤 Старый email:', admin.email);
    
    // Обновляем email на 'admin'
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('players')
      .update({ email: 'admin' })
      .eq('id', admin.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Ошибка обновления администратора:', updateError);
      return;
    }
    
    console.log('✅ Администратор успешно обновлен:');
    console.log('👤 ID:', updatedAdmin.id);
    console.log('👤 Имя:', updatedAdmin.name);
    console.log('👤 Новый email:', updatedAdmin.email);
    console.log('🔑 Пароль:', updatedAdmin.password);
    
    console.log('\n🎉 Логин администратора изменен с admin@hockeystars.com на admin');
    console.log('Теперь можно войти используя:');
    console.log('   Логин: admin');
    console.log('   Пароль: admin123');
    
  } catch (error) {
    console.error('❌ Ошибка выполнения скрипта:', error);
  }
}

// Запускаем скрипт
updateAdminLogin(); 