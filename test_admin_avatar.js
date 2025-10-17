// Тест для проверки аватара администратора
// Запустите: node test_admin_avatar.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminAvatar() {
  try {
    console.log('🔍 Проверяем аватар администратора...\n');
    
    // Ищем администратора
    const { data: admin, error } = await supabase
      .from('players')
      .select('id, name, email, status, avatar, created_at')
      .eq('email', 'admin@hockeystars.com')
      .single();
    
    if (error) {
      console.error('❌ Ошибка поиска администратора:', error);
      return;
    }
    
    if (!admin) {
      console.log('❌ Администратор не найден');
      return;
    }
    
    console.log('✅ Администратор найден:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Имя: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Статус: ${admin.status}`);
    console.log(`   Аватар: ${admin.avatar || 'НЕ УСТАНОВЛЕН'}`);
    console.log(`   Создан: ${admin.created_at}`);
    
    if (admin.avatar) {
      console.log('\n🔗 Проверяем ссылку на аватар...');
      console.log(`   URL: ${admin.avatar}`);
      
      // Проверяем, что ссылка валидная
      if (admin.avatar.startsWith('http')) {
        console.log('✅ Ссылка валидная (начинается с http)');
      } else {
        console.log('⚠️ Ссылка не валидная (не начинается с http)');
      }
      
      // Проверяем, что файл существует в Storage
      const fileName = admin.avatar.split('/').pop();
      console.log(`   Имя файла: ${fileName}`);
      
      const { data: fileData, error: fileError } = await supabase.storage
        .from('avatars')
        .list('', {
          search: fileName
        });
      
      if (fileError) {
        console.error('❌ Ошибка проверки файла в Storage:', fileError);
      } else if (fileData && fileData.length > 0) {
        console.log('✅ Файл найден в Storage');
      } else {
        console.log('❌ Файл НЕ найден в Storage');
      }
    } else {
      console.log('\n❌ Аватар не установлен');
    }
    
    // Проверяем всех пользователей с аватарами
    console.log('\n📋 Все пользователи с аватарами:');
    const { data: allUsers, error: allError } = await supabase
      .from('players')
      .select('id, name, email, status, avatar')
      .not('avatar', 'is', null)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Ошибка получения пользователей с аватарами:', allError);
    } else {
      console.log(`   Найдено пользователей с аватарами: ${allUsers.length}`);
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.status}`);
        console.log(`      Аватар: ${user.avatar}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testAdminAvatar(); 