const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificExercise() {
  try {
    console.log('🔍 Проверяем конкретное упражнение...\n');

    // Проверяем упражнение 11
    const { data: exercise, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('exercise_id', '11')
      .single();

    if (error) {
      console.error('❌ Ошибка получения упражнения:', error);
      return;
    }

    console.log('📋 Данные упражнения 11:');
    console.log('ID:', exercise.exercise_id);
    console.log('Название RU:', exercise.title_ru);
    console.log('Название EN:', exercise.title_en);
    console.log('Описание RU:', exercise.description_ru);
    console.log('Описание EN:', exercise.description_en);
    console.log('Польза RU:', exercise.benefits_ru);
    console.log('Польза EN:', exercise.benefits_en);
    console.log('Инструкции RU:', exercise.instructions_ru);
    console.log('Инструкции EN:', exercise.instructions_en);
    console.log('Советы RU:', exercise.tips_ru);
    console.log('Советы EN:', exercise.tips_en);
    console.log('Оборудование RU:', exercise.equipment_ru);
    console.log('Оборудование EN:', exercise.equipment_en);
    console.log('Калории RU:', exercise.calories_ru);
    console.log('Калории EN:', exercise.calories_en);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkSpecificExercise();


