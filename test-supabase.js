console.log('🚀 Скрипт запущен!');

try {
  const { createClient } = require('@supabase/supabase-js');
  console.log('✅ Supabase клиент загружен');
  
  const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase клиент создан');
  
  // Тестируем подключение
  supabase.from('players').select('count').then(result => {
    console.log('✅ Подключение к базе данных работает');
    console.log('📊 Результат:', result);
  }).catch(error => {
    console.error('❌ Ошибка подключения к БД:', error);
  });
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}