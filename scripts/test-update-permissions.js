const { createClient } = require('@supabase/supabase-js');

// Подключение к Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdatePermissions() {
  try {
    console.log('🔍 Тестируем права доступа для обновления...');
    
    // 1. Проверим, можем ли мы читать данные
    console.log('\n📖 Тест чтения данных...');
    const { data: readData, error: readError } = await supabase
      .from('exercises')
      .select('exercise_id, title_ru')
      .eq('exercise_id', '38')
      .limit(1);
    
    if (readError) {
      console.error('❌ Ошибка чтения:', readError);
    } else {
      console.log('✅ Чтение работает:', readData);
    }
    
    // 2. Попробуем обновить простое поле
    console.log('\n✏️ Тест обновления простого поля...');
    const { data: updateData, error: updateError } = await supabase
      .from('exercises')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '38')
      .select();
    
    if (updateError) {
      console.error('❌ Ошибка обновления простого поля:', updateError);
    } else {
      console.log('✅ Обновление простого поля работает:', updateData);
    }
    
    // 3. Попробуем обновить JSON поле как строку
    console.log('\n✏️ Тест обновления JSON поля как строки...');
    const testJsonString = '["Тест инструкция 1", "Тест инструкция 2"]';
    const { data: jsonUpdateData, error: jsonUpdateError } = await supabase
      .from('exercises')
      .update({
        instructions_ru: testJsonString,
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '38')
      .select();
    
    if (jsonUpdateError) {
      console.error('❌ Ошибка обновления JSON поля:', jsonUpdateError);
    } else {
      console.log('✅ Обновление JSON поля работает:', jsonUpdateData);
    }
    
    // 4. Проверим результат
    console.log('\n📋 Проверяем результат JSON обновления...');
    const { data: checkData, error: checkError } = await supabase
      .from('exercises')
      .select('exercise_id, instructions_ru')
      .eq('exercise_id', '38')
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError);
    } else {
      console.log('✅ Результат JSON обновления:');
      console.log('  - exercise_id:', checkData.exercise_id);
      console.log('  - instructions_ru:', checkData.instructions_ru);
      console.log('  - type:', typeof checkData.instructions_ru);
      
      // Попробуем распарсить
      if (typeof checkData.instructions_ru === 'string') {
        try {
          const parsed = JSON.parse(checkData.instructions_ru);
          console.log('  - parsed:', parsed);
        } catch (e) {
          console.log('  - parse error:', e.message);
        }
      }
    }
    
    // 5. Попробуем обновить как массив напрямую
    console.log('\n✏️ Тест обновления как массив...');
    const { data: arrayUpdateData, error: arrayUpdateError } = await supabase
      .from('exercises')
      .update({
        instructions_ru: ['Массив инструкция 1', 'Массив инструкция 2'],
        tips_ru: ['Массив совет 1', 'Массив совет 2'],
        updated_at: new Date().toISOString()
      })
      .eq('exercise_id', '38')
      .select();
    
    if (arrayUpdateError) {
      console.error('❌ Ошибка обновления массива:', arrayUpdateError);
    } else {
      console.log('✅ Обновление массива работает:', arrayUpdateData);
    }
    
    // 6. Финальная проверка
    console.log('\n📋 Финальная проверка...');
    const { data: finalData, error: finalError } = await supabase
      .from('exercises')
      .select('exercise_id, instructions_ru, tips_ru')
      .eq('exercise_id', '38')
      .single();
    
    if (finalError) {
      console.error('❌ Ошибка финальной проверки:', finalError);
    } else {
      console.log('✅ Финальные данные:');
      console.log('  - exercise_id:', finalData.exercise_id);
      console.log('  - instructions_ru:', finalData.instructions_ru);
      console.log('  - tips_ru:', finalData.tips_ru);
      console.log('  - instructions type:', typeof finalData.instructions_ru);
      console.log('  - tips type:', typeof finalData.tips_ru);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка тестирования:', error);
  }
}

// Запускаем тест
testUpdatePermissions();








