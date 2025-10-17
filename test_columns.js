// Простой тест для проверки колонок в базе данных
// Запустите: node test_columns.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  try {
    console.log('🔍 Проверяем наличие колонок в таблице players...\n');
    
    // Тест 1: Проверяем базовое подключение
    console.log('1️⃣ Тестируем подключение...');
    const { data: testData, error: testError } = await supabase
      .from('players')
      .select('id, name')
      .limit(1);
    
    if (testError) {
      console.error('❌ Ошибка подключения:', testError.message);
      return;
    }
    console.log('✅ Подключение работает\n');
    
    // Тест 2: Проверяем наличие новых колонок
    console.log('2️⃣ Проверяем наличие новых колонок...');
    
    const columnsToTest = [
      'favorite_goals',
      'photos', 
      'number'
    ];
    
    for (const column of columnsToTest) {
      try {
        const { data, error } = await supabase
          .from('players')
          .select(`id, ${column}`)
          .limit(1);
        
        if (error) {
          console.log(`❌ Колонка ${column}: ОТСУТСТВУЕТ`);
          console.log(`   Ошибка: ${error.message}`);
        } else {
          console.log(`✅ Колонка ${column}: ПРИСУТСТВУЕТ`);
        }
      } catch (err) {
        console.log(`❌ Колонка ${column}: ОШИБКА ПРИ ПРОВЕРКЕ`);
        console.log(`   Ошибка: ${err.message}`);
      }
    }
    
    console.log('\n3️⃣ Проверяем данные в таблице...');
    const { data: allData, error: allError } = await supabase
      .from('players')
      .select('*')
      .limit(3);
    
    if (allError) {
      console.error('❌ Ошибка получения данных:', allError.message);
    } else {
      console.log(`✅ Найдено игроков: ${allData.length}`);
      if (allData.length > 0) {
        const player = allData[0];
        console.log('📋 Пример данных первого игрока:');
        console.log(`   ID: ${player.id}`);
        console.log(`   Имя: ${player.name}`);
        console.log(`   Аватар: ${player.avatar || 'не установлен'}`);
        console.log(`   Любимые голы: ${player.favorite_goals || 'не установлены'}`);
        console.log(`   Фотографии: ${player.photos || 'не установлены'}`);
        console.log(`   Номер: ${player.number || 'не установлен'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

testColumns(); 