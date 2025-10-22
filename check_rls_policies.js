const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Проверяем RLS политики для таблицы exercises...\n');

    // Проверяем, можем ли мы читать данные
    const { data: readData, error: readError } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, benefits_ru')
      .eq('exercise_id', '27')
      .single();

    if (readError) {
      console.error('❌ Ошибка чтения:', readError);
    } else {
      console.log('✅ Чтение работает:', readData);
    }

    // Проверяем, можем ли мы обновлять данные
    console.log('\n🔄 Пробуем обновить с логированием...');
    
    const { data: updateData, error: updateError } = await supabase
      .from('exercises')
      .update({ 
        benefits_ru: ["Тест 1", "Тест 2", "Тест 3"],
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '27')
      .select('exercise_id, benefits_ru, updated_at');

    console.log('Update result:', { updateData, updateError });

    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
    } else {
      console.log('✅ Обновление успешно:', updateData);
    }

    // Проверяем, что изменилось
    console.log('\n🔍 Проверяем результат...');
    const { data: finalData, error: finalError } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, benefits_ru, updated_at')
      .eq('exercise_id', '27')
      .single();

    if (finalError) {
      console.error('❌ Ошибка финальной проверки:', finalError);
    } else {
      console.log('📋 Финальные данные:', finalData);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkRLSPolicies();
