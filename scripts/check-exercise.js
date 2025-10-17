const { createClient } = require('@supabase/supabase-js');

// Подключение к Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExercise() {
  try {
    console.log('🔍 Проверяем упражнение #38 (Прыжки с поворотами)...');
    
    const { data: exercise, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, instructions_ru, tips_ru')
      .eq('exercise_id', '38')
      .single();

    if (error) {
      console.error('❌ Ошибка получения упражнения:', error);
      return;
    }

    console.log('📋 Данные упражнения:');
    console.log('ID:', exercise.exercise_id);
    console.log('Название:', exercise.title_ru);
    console.log('Инструкции:', JSON.stringify(exercise.instructions_ru, null, 2));
    console.log('Советы:', JSON.stringify(exercise.tips_ru, null, 2));
    
    // Проверим тип данных
    console.log('\n🔍 Типы данных:');
    console.log('instructions_ru type:', typeof exercise.instructions_ru);
    console.log('tips_ru type:', typeof exercise.tips_ru);
    console.log('instructions_ru is array:', Array.isArray(exercise.instructions_ru));
    console.log('tips_ru is array:', Array.isArray(exercise.tips_ru));

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запускаем проверку
checkExercise();








