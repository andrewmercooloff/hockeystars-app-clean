const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTranslations() {
  try {
    console.log('🔍 Проверяем переводы упражнений...\n');

    // Получаем все упражнения
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, title_en, description_ru, description_en, benefits_ru, benefits_en, instructions_ru, instructions_en, tips_ru, tips_en')
      .order('exercise_id', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения упражнений:', error);
      return;
    }

    console.log(`📊 Всего упражнений: ${exercises.length}\n`);

    let problemsFound = 0;

    exercises.forEach((exercise, index) => {
      const issues = [];
      
      // Проверяем английские переводы
      if (!exercise.title_en || exercise.title_en.trim() === '' || exercise.title_en === exercise.title_ru) {
        issues.push('title_en');
      }
      if (!exercise.description_en || exercise.description_en.trim() === '' || exercise.description_en === exercise.description_ru) {
        issues.push('description_en');
      }
      if (!exercise.benefits_en || (Array.isArray(exercise.benefits_en) && exercise.benefits_en.length === 0)) {
        issues.push('benefits_en');
      }
      if (!exercise.instructions_en || (Array.isArray(exercise.instructions_en) && exercise.instructions_en.length === 0)) {
        issues.push('instructions_en');
      }
      if (!exercise.tips_en || (Array.isArray(exercise.tips_en) && exercise.tips_en.length === 0)) {
        issues.push('tips_en');
      }

      if (issues.length > 0) {
        problemsFound++;
        console.log(`🔸 Упражнение ${exercise.exercise_id}: ${exercise.title_ru}`);
        console.log(`   Проблемы с переводами: ${issues.join(', ')}`);
        
        // Показываем примеры проблем
        if (issues.includes('title_en')) {
          console.log(`   Название EN: "${exercise.title_en}"`);
        }
        if (issues.includes('description_en')) {
          console.log(`   Описание EN: "${exercise.description_en}"`);
        }
        console.log('');
      }
    });

    console.log(`\n📊 Итого проблемных упражнений: ${problemsFound}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkTranslations();


