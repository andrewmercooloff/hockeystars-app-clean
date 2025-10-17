const { createClient } = require('@supabase/supabase-js');

// Подключение к Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSupabase() {
  try {
    console.log('🔍 Отладка Supabase...');
    
    // 1. Проверим структуру таблицы
    console.log('\n📋 Проверяем структуру таблицы exercises...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'exercises')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Ошибка получения структуры таблицы:', tableError);
    } else {
      console.log('✅ Структура таблицы exercises:');
      tableInfo.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // 2. Проверим текущие данные упражнения #38
    console.log('\n📋 Проверяем текущие данные упражнения #38...');
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('*')
      .eq('exercise_id', '38')
      .single();
    
    if (exerciseError) {
      console.error('❌ Ошибка получения упражнения:', exerciseError);
    } else {
      console.log('✅ Данные упражнения #38:');
      console.log('  - exercise_id:', exercise.exercise_id);
      console.log('  - title_ru:', exercise.title_ru);
      console.log('  - instructions_ru:', exercise.instructions_ru);
      console.log('  - tips_ru:', exercise.tips_ru);
      console.log('  - updated_at:', exercise.updated_at);
    }
    
    // 3. Попробуем обновить через SQL функцию
    console.log('\n🔧 Попробуем обновить через SQL...');
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_exercise_instructions', {
        exercise_id_param: '38',
        instructions_param: [
          'Встаньте прямо, ноги на ширине плеч',
          'Сделайте прыжок вверх',
          'Во время прыжка повернитесь на 180 градусов',
          'Приземлитесь мягко на обе ноги',
          'Сразу повернитесь обратно и повторите'
        ],
        tips_param: [
          'Приземляйтесь на полусогнутые ноги',
          'Работайте руками для баланса',
          'Начинайте с небольших поворотов',
          'Следите за техникой приземления'
        ]
      });
    
    if (updateError) {
      console.log('⚠️ SQL функция не найдена, это нормально:', updateError.message);
    } else {
      console.log('✅ SQL обновление успешно:', updateResult);
    }
    
    // 4. Попробуем простое обновление строки
    console.log('\n🔧 Попробуем простое обновление строки...');
    const { data: simpleUpdate, error: simpleError } = await supabase
      .from('exercises')
      .update({
        instructions_ru: JSON.stringify([
          'Встаньте прямо, ноги на ширине плеч',
          'Сделайте прыжок вверх',
          'Во время прыжка повернитесь на 180 градусов',
          'Приземлитесь мягко на обе ноги',
          'Сразу повернитесь обратно и повторите'
        ]),
        tips_ru: JSON.stringify([
          'Приземляйтесь на полусогнутые ноги',
          'Работайте руками для баланса',
          'Начинайте с небольших поворотов',
          'Следите за техникой приземления'
        ]),
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '38')
      .select();
    
    if (simpleError) {
      console.error('❌ Ошибка простого обновления:', simpleError);
    } else {
      console.log('✅ Простое обновление успешно:', simpleUpdate);
    }
    
    // 5. Проверим результат
    console.log('\n📋 Проверяем результат обновления...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru, instructions_ru, tips_ru, updated_at')
      .eq('exercise_id', '38')
      .single();
    
    if (finalError) {
      console.error('❌ Ошибка финальной проверки:', finalError);
    } else {
      console.log('✅ Финальные данные:');
      console.log('  - exercise_id:', finalCheck.exercise_id);
      console.log('  - title_ru:', finalCheck.title_ru);
      console.log('  - instructions_ru:', finalCheck.instructions_ru);
      console.log('  - tips_ru:', finalCheck.tips_ru);
      console.log('  - updated_at:', finalCheck.updated_at);
      
      // Попробуем распарсить JSON
      if (typeof finalCheck.instructions_ru === 'string') {
        try {
          const parsedInstructions = JSON.parse(finalCheck.instructions_ru);
          console.log('  - parsed instructions:', parsedInstructions);
        } catch (e) {
          console.log('  - failed to parse instructions:', e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка отладки:', error);
  }
}

// Запускаем отладку
debugSupabase();








