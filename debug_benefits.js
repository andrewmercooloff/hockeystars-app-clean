const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBenefits() {
  try {
    console.log('🔍 Проверяем конкретное упражнение...\n');

    // Проверяем упражнение 27
    const { data: exercise, error } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, benefits_ru, benefits_en')
      .eq('exercise_id', '27')
      .single();

    if (error) {
      console.error('❌ Ошибка загрузки упражнения:', error);
      return;
    }

    console.log('📋 Упражнение 27:');
    console.log(`ID: ${exercise.exercise_id}`);
    console.log(`Title: ${exercise.title_ru}`);
    console.log(`RU Benefits: ${JSON.stringify(exercise.benefits_ru)}`);
    console.log(`EN Benefits: ${JSON.stringify(exercise.benefits_en)}`);
    console.log(`RU Benefits Type: ${typeof exercise.benefits_ru}`);
    console.log(`RU Benefits Length: ${Array.isArray(exercise.benefits_ru) ? exercise.benefits_ru.length : 'Not array'}`);

    // Попробуем обновить вручную
    console.log('\n🔄 Пробуем обновить вручную...');
    
    const testBenefits = ["Разогревает мышцы шеи", "Предотвращает травмы шеи", "Улучшает подвижность шеи", "Снимает напряжение"];
    
    const { data: updateData, error: updateError } = await supabase
      .from('exercises')
      .update({ benefits_ru: testBenefits })
      .eq('exercise_id', '27')
      .select();

    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
    } else {
      console.log('✅ Обновление успешно:', updateData);
    }

    // Проверяем снова
    console.log('\n🔍 Проверяем после обновления...');
    const { data: exerciseAfter, error: errorAfter } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, benefits_ru, benefits_en')
      .eq('exercise_id', '27')
      .single();

    if (errorAfter) {
      console.error('❌ Ошибка загрузки после обновления:', errorAfter);
    } else {
      console.log('📋 Упражнение 27 после обновления:');
      console.log(`RU Benefits: ${JSON.stringify(exerciseAfter.benefits_ru)}`);
      console.log(`RU Benefits Length: ${Array.isArray(exerciseAfter.benefits_ru) ? exerciseAfter.benefits_ru.length : 'Not array'}`);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

debugBenefits();
