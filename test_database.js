// Тестовый скрипт для проверки подключения к базе данных
// Запустите: node test_database.js

const { createClient } = require('@supabase/supabase-js');

// Замените на ваши данные из Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('🔍 Тестирование подключения к базе данных...');
    
    // Проверяем подключение
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения:', error);
      return;
    }
    
    console.log('✅ Подключение успешно!');
    
    // Проверяем структуру таблицы
    console.log('🔍 Проверяем структуру таблицы players...');
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'players' });
    
    if (columnsError) {
      console.log('⚠️ Не удалось получить информацию о колонках, проверяем наличие нужных полей...');
      
      // Проверяем наличие нужных полей через тестовый запрос
      const { data: testData, error: testError } = await supabase
        .from('players')
        .select('id, name, favorite_goals, photos, number')
        .limit(1);
      
      if (testError) {
        console.error('❌ Ошибка при проверке полей:', testError.message);
        
        if (testError.message.includes('favorite_goals')) {
          console.log('⚠️ Колонка favorite_goals отсутствует');
        }
        if (testError.message.includes('photos')) {
          console.log('⚠️ Колонка photos отсутствует');
        }
        if (testError.message.includes('number')) {
          console.log('⚠️ Колонка number отсутствует');
        }
        
        console.log('\n📋 Выполните SQL-скрипт из файла database/add_missing_columns.sql');
      } else {
        console.log('✅ Все нужные поля присутствуют!');
      }
    } else {
      console.log('📋 Колонки таблицы players:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Функция для добавления недостающих колонок
async function addMissingColumns() {
  try {
    console.log('🔧 Добавление недостающих колонок...');
    
    const queries = [
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS favorite_goals TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS photos TEXT;',
      'ALTER TABLE players ADD COLUMN IF NOT EXISTS number VARCHAR(10);',
      'UPDATE players SET favorite_goals = \'\' WHERE favorite_goals IS NULL;',
      'UPDATE players SET photos = \'[]\' WHERE photos IS NULL;',
      'UPDATE players SET number = \'\' WHERE number IS NULL;'
    ];
    
    for (const query of queries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('❌ Ошибка выполнения запроса:', error);
      } else {
        console.log('✅ Запрос выполнен успешно');
      }
    }
    
    console.log('✅ Все колонки добавлены!');
    
  } catch (error) {
    console.error('❌ Ошибка добавления колонок:', error);
  }
}

// Запуск тестов
async function main() {
  console.log('🚀 Запуск тестов базы данных...\n');
  
  await testDatabase();
  
  console.log('\n' + '='.repeat(50));
  console.log('Для добавления недостающих колонок раскомментируйте строку ниже:');
  console.log('// await addMissingColumns();');
}

main(); 