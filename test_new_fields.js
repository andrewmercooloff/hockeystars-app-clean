// Тестовый скрипт для проверки новых полей в базе данных
const { createClient } = require('@supabase/supabase-js');

// Замените на ваши данные Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewFields() {
  try {
    console.log('🔍 Проверяем структуру таблицы players...');
    
    // Проверяем, что поля существуют
    const { data, error } = await supabase
      .from('players')
      .select('id, name, individual_training, skate_services')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка при запросе:', error);
      return;
    }
    
    console.log('✅ Поля individual_training и skate_services существуют в таблице');
    console.log('📊 Пример данных:', data[0]);
    
    // Проверяем, что можем обновить поля
    console.log('\n🔍 Тестируем обновление полей...');
    
    const testPlayerId = data[0]?.id;
    if (testPlayerId) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          individual_training: ['hockeySkills', 'skating'],
          skate_services: ['skateSharpeningService', 'equipmentRepair']
        })
        .eq('id', testPlayerId);
      
      if (updateError) {
        console.error('❌ Ошибка при обновлении:', updateError);
      } else {
        console.log('✅ Поля успешно обновлены');
        
        // Проверяем, что данные сохранились
        const { data: updatedData, error: fetchError } = await supabase
          .from('players')
          .select('individual_training, skate_services')
          .eq('id', testPlayerId)
          .single();
        
        if (fetchError) {
          console.error('❌ Ошибка при получении обновленных данных:', fetchError);
        } else {
          console.log('✅ Обновленные данные:', updatedData);
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err);
  }
}

testNewFields();

