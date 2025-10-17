const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Загружаем переменные окружения
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupActivityRating() {
  try {
    console.log('🚀 Начинаем настройку системы рейтинга активности...');
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('./create_activity_points_table.sql', 'utf8');
    
    // Выполняем SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Ошибка выполнения SQL:', error);
      return;
    }
    
    console.log('✅ Таблицы activity_points и activity_log созданы успешно!');
    console.log('✅ Политики RLS настроены!');
    console.log('✅ Индексы созданы!');
    console.log('✅ Триггеры настроены!');
    
    // Проверяем создание таблиц
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['activity_points', 'activity_log']);
    
    if (tablesError) {
      console.error('❌ Ошибка проверки таблиц:', tablesError);
      return;
    }
    
    console.log('📊 Созданные таблицы:', tables?.map(t => t.table_name));
    
    console.log('\n🎉 Система рейтинга активности готова к использованию!');
    console.log('\n📋 Что было создано:');
    console.log('   • Таблица activity_points - хранение очков пользователей');
    console.log('   • Таблица activity_log - история активности');
    console.log('   • Политики RLS для безопасности');
    console.log('   • Индексы для быстрого поиска');
    console.log('   • Триггеры для автоматического обновления');
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем настройку
setupActivityRating();
