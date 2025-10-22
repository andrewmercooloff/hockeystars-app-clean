const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingBenefits() {
  try {
    console.log('🔍 Проверяем упражнения без блока "польза"...\n');

    // Получаем все упражнения
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, title_en, benefits_ru, benefits_en')
      .eq('is_active', true)
      .order('exercise_id');

    if (error) {
      console.error('❌ Ошибка загрузки упражнений:', error);
      return;
    }

    console.log(`📊 Всего упражнений: ${exercises.length}\n`);

    // Находим упражнения без пользы
    const missingBenefits = exercises.filter(exercise => {
      const hasRuBenefits = exercise.benefits_ru && 
        Array.isArray(exercise.benefits_ru) && 
        exercise.benefits_ru.length > 0;
      
      const hasEnBenefits = exercise.benefits_en && 
        Array.isArray(exercise.benefits_en) && 
        exercise.benefits_en.length > 0;

      return !hasRuBenefits || !hasEnBenefits;
    });

    console.log(`❌ Упражнения без блока "польза": ${missingBenefits.length}\n`);

    if (missingBenefits.length > 0) {
      console.log('📋 Список упражнений без пользы:');
      console.log('='.repeat(60));
      
      missingBenefits.forEach(exercise => {
        const ruStatus = exercise.benefits_ru && Array.isArray(exercise.benefits_ru) && exercise.benefits_ru.length > 0 ? '✅' : '❌';
        const enStatus = exercise.benefits_en && Array.isArray(exercise.benefits_en) && exercise.benefits_en.length > 0 ? '✅' : '❌';
        
        console.log(`ID: ${exercise.exercise_id}`);
        console.log(`RU: ${exercise.title_ru} ${ruStatus}`);
        console.log(`EN: ${exercise.title_en} ${enStatus}`);
        console.log(`RU Benefits: ${JSON.stringify(exercise.benefits_ru)}`);
        console.log(`EN Benefits: ${JSON.stringify(exercise.benefits_en)}`);
        console.log('-'.repeat(60));
      });
    } else {
      console.log('✅ Все упражнения имеют блок "польза"!');
    }

    // Статистика по языкам
    const missingRu = exercises.filter(ex => !ex.benefits_ru || !Array.isArray(ex.benefits_ru) || ex.benefits_ru.length === 0);
    const missingEn = exercises.filter(ex => !ex.benefits_en || !Array.isArray(ex.benefits_en) || ex.benefits_en.length === 0);

    console.log('\n📈 Статистика:');
    console.log(`- Без пользы на русском: ${missingRu.length}`);
    console.log(`- Без пользы на английском: ${missingEn.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkMissingBenefits();
