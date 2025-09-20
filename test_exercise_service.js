// Тест ExerciseService
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExerciseService() {
  try {
    console.log('🔄 Тестируем ExerciseService...');
    
    // Тестируем получение упражнений
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('exercise_id', { ascending: true });
    
    if (error) {
      console.error('❌ Ошибка:', error);
      return;
    }
    
    console.log('✅ Упражнения получены:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Первое упражнение:');
      console.log('  ID:', data[0].exercise_id);
      console.log('  Название RU:', data[0].title_ru);
      console.log('  Название EN:', data[0].title_en);
      console.log('  Категория:', data[0].category);
      console.log('  Сложность:', data[0].difficulty);
      console.log('  Польза RU:', data[0].benefits_ru);
      console.log('  Польза EN:', data[0].benefits_en);
    }
    
    // Тестируем получение категорий
    const { data: categories, error: categoriesError } = await supabase
      .from('exercises')
      .select('category')
      .eq('is_active', true);
    
    if (!categoriesError && categories) {
      const uniqueCategories = [...new Set(categories.map(c => c.category))];
      console.log('🏷️ Категории:', uniqueCategories);
    }
    
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

testExerciseService();






