// Тест подключения к базе данных
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Тестируем подключение...');
    
    // Простой запрос к таблице exercises
    const { data, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, title_en')
      .limit(3);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error);
      return;
    }
    
    console.log('✅ Подключение успешно!');
    console.log('📊 Найдено упражнений:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Первые упражнения:');
      data.forEach(ex => {
        console.log(`  ${ex.exercise_id}. ${ex.title_ru} (${ex.title_en})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

testConnection();






