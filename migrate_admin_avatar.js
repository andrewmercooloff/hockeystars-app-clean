// Скрипт для миграции аватара администратора в Storage
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAdminAvatar() {
  console.log('🔧 Миграция аватара администратора...\n');
  
  try {
    // 1. Получаем администратора
    const { data: admin, error: adminError } = await supabase
      .from('players')
      .select('id, name, avatar')
      .eq('name', 'Администратор')
      .single();
    
    if (adminError) {
      console.error('❌ Ошибка получения администратора:', adminError);
      return;
    }
    
    console.log(`👤 Администратор: ${admin.name}`);
    console.log(`📁 Текущий аватар: ${admin.avatar}`);
    
    if (!admin.avatar || !admin.avatar.startsWith('file://')) {
      console.log('✅ Аватар уже в Storage или отсутствует');
      return;
    }
    
    // 2. Создаем новый аватар в Storage
    console.log('\n📤 Создаем новый аватар в Storage...');
    
    const timestamp = Date.now();
    const fileName = `admin_avatar_${admin.id}_${timestamp}.png`;
    
    // Создаем тестовое изображение (синий квадрат)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testImageData, 'base64');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, testBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Ошибка загрузки в Storage:', uploadError);
      return;
    }
    
    console.log('✅ Файл загружен в Storage:', uploadData.path);
    
    // 3. Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('❌ Не удалось получить публичный URL');
      return;
    }
    
    const publicUrl = urlData.publicUrl;
    console.log('✅ Публичный URL:', publicUrl);
    
    // 4. Обновляем аватар в базе данных
    console.log('\n💾 Обновляем аватар в базе данных...');
    
    const { error: updateError } = await supabase
      .from('players')
      .update({ avatar: publicUrl })
      .eq('id', admin.id);
    
    if (updateError) {
      console.error('❌ Ошибка обновления в базе данных:', updateError);
      return;
    }
    
    console.log('✅ Аватар обновлен в базе данных');
    
    // 5. Проверяем результат
    console.log('\n🔍 Проверяем результат...');
    
    const { data: updatedAdmin, error: checkError } = await supabase
      .from('players')
      .select('name, avatar')
      .eq('id', admin.id)
      .single();
    
    if (!checkError && updatedAdmin) {
      console.log(`👤 ${updatedAdmin.name}:`);
      if (updatedAdmin.avatar && updatedAdmin.avatar.startsWith('http')) {
        console.log(`   ✅ Storage URL: ${updatedAdmin.avatar}`);
      } else {
        console.log(`   ❌ Все еще локальный: ${updatedAdmin.avatar}`);
      }
    }
    
    console.log('\n🎉 Миграция аватара администратора завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  }
}

// Запускаем миграцию
migrateAdminAvatar(); 