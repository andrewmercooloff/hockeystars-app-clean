// Скрипт для тестирования доступа к bucket avatars
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Имитируем функцию ensureAvatarsBucket
const ensureAvatarsBucket = async () => {
  try {
    console.log('🔍 Проверяем доступ к bucket avatars...');
    
    // Пытаемся загрузить тестовый файл для проверки доступа к bucket
    const testFileName = `test_access_${Date.now()}.txt`;
    const testContent = 'test';
    
    console.log('📤 Пытаемся загрузить тестовый файл:', testFileName);
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Ошибка доступа к bucket avatars:', error);
      console.log('⚠️ Убедитесь, что bucket avatars существует и доступен');
      return false;
    }
    
    console.log('✅ Тестовый файл загружен:', data.path);
    
    // Удаляем тестовый файл
    console.log('🗑️ Удаляем тестовый файл...');
    const { error: removeError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    if (removeError) {
      console.warn('⚠️ Не удалось удалить тестовый файл:', removeError);
    } else {
      console.log('✅ Тестовый файл удален');
    }
    
    console.log('✅ Bucket avatars доступен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки bucket:', error);
    return false;
  }
};

async function testBucketAccess() {
  console.log('🧪 Тестирование доступа к bucket avatars...\n');
  
  const result = await ensureAvatarsBucket();
  
  if (result) {
    console.log('\n✅ Bucket avatars работает корректно!');
    console.log('Проблема не в доступе к bucket.');
  } else {
    console.log('\n❌ Bucket avatars недоступен!');
    console.log('Это может быть причиной проблемы с загрузкой аватаров.');
  }
}

// Запускаем тест
testBucketAccess(); 