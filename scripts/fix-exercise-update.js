const { createClient } = require('@supabase/supabase-js');

// Подключение к Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Тестовые данные для упражнения #38
const testInstructions = [
  'Встаньте прямо, ноги на ширине плеч',
  'Сделайте прыжок вверх',
  'Во время прыжка повернитесь на 180 градусов',
  'Приземлитесь мягко на обе ноги',
  'Сразу повернитесь обратно и повторите'
];

const testTips = [
  'Приземляйтесь на полусогнутые ноги',
  'Работайте руками для баланса',
  'Начинайте с небольших поворотов',
  'Следите за техникой приземления'
];

async function fixExerciseUpdate() {
  try {
    console.log('🔧 Исправляем обновление упражнения #38...');
    
    // Попробуем разные способы обновления
    console.log('\n📝 Способ 1: Прямая передача массива');
    const { error: error1 } = await supabase
      .from('exercises')
      .update({
        instructions_ru: testInstructions,
        tips_ru: testTips,
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '38');
    
    if (error1) {
      console.error('❌ Ошибка способа 1:', error1);
    } else {
      console.log('✅ Способ 1 успешен');
    }
    
    // Проверим результат
    const { data: exercise, error: checkError } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, instructions_ru, tips_ru')
      .eq('exercise_id', '38')
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError);
    } else {
      console.log('\n📋 Результат после обновления:');
      console.log('Инструкции:', JSON.stringify(exercise.instructions_ru, null, 2));
      console.log('Советы:', JSON.stringify(exercise.tips_ru, null, 2));
      console.log('Количество инструкций:', exercise.instructions_ru?.length || 0);
      console.log('Количество советов:', exercise.tips_ru?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  }
}

// Запускаем исправление
fixExerciseUpdate();








