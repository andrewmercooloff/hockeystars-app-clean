const { createClient } = require('@supabase/supabase-js');

// Загружаем переменные окружения
require('dotenv').config();

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addNotificationColumn() {
  try {
    console.log('🔄 Добавляем столбец unread_notifications_count...');
    
    // Выполняем SQL запрос
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE players ADD COLUMN IF NOT EXISTS unread_notifications_count INTEGER DEFAULT 0;'
    });

    if (error) {
      console.error('❌ Ошибка при добавлении столбца:', error);
      return;
    }

    console.log('✅ Столбец unread_notifications_count успешно добавлен!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

addNotificationColumn();
