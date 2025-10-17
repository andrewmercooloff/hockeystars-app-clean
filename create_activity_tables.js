const { createClient } = require('@supabase/supabase-js');

// Загружаем переменные окружения
require('dotenv').config();

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

console.log('🔍 Проверяем переменные окружения...');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Найден' : '❌ Отсутствует');
console.log('SUPABASE_KEY:', supabaseKey ? '✅ Найден' : '❌ Отсутствует');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_ANON_KEY');
  console.log('📝 Убедитесь, что файл .env содержит:');
  console.log('EXPO_PUBLIC_SUPABASE_URL=your_url');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createActivityTables() {
  try {
    console.log('🚀 Создаем таблицы для системы рейтинга активности...');
    
    // Создаем таблицу activity_points
    const { error: pointsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS activity_points (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          points INTEGER NOT NULL DEFAULT 0,
          last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (pointsError) {
      console.error('❌ Ошибка создания таблицы activity_points:', pointsError);
    } else {
      console.log('✅ Таблица activity_points создана');
    }
    
    // Создаем таблицу activity_log
    const { error: logError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS activity_log (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          points_earned INTEGER NOT NULL DEFAULT 1,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (logError) {
      console.error('❌ Ошибка создания таблицы activity_log:', logError);
    } else {
      console.log('✅ Таблица activity_log создана');
    }
    
    // Создаем индексы
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_activity_points_user_id ON activity_points(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_points_unique_user ON activity_points(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
      `
    });
    
    if (indexError) {
      console.error('❌ Ошибка создания индексов:', indexError);
    } else {
      console.log('✅ Индексы созданы');
    }
    
    // Включаем RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE activity_points ENABLE ROW LEVEL SECURITY;
        ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rlsError) {
      console.error('❌ Ошибка включения RLS:', rlsError);
    } else {
      console.log('✅ RLS включен');
    }
    
    // Создаем политики RLS
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Политики для activity_points
        DROP POLICY IF EXISTS "Users can view own activity points" ON activity_points;
        CREATE POLICY "Users can view own activity points" ON activity_points
          FOR SELECT USING (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can update own activity points" ON activity_points;
        CREATE POLICY "Users can update own activity points" ON activity_points
          FOR UPDATE USING (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can insert own activity points" ON activity_points;
        CREATE POLICY "Users can insert own activity points" ON activity_points
          FOR INSERT WITH CHECK (auth.uid() = user_id);
          
        -- Политики для activity_log
        DROP POLICY IF EXISTS "Users can view own activity log" ON activity_log;
        CREATE POLICY "Users can view own activity log" ON activity_log
          FOR SELECT USING (auth.uid() = user_id);
          
        DROP POLICY IF EXISTS "Users can insert own activity log" ON activity_log;
        CREATE POLICY "Users can insert own activity log" ON activity_log
          FOR INSERT WITH CHECK (auth.uid() = user_id);
      `
    });
    
    if (policyError) {
      console.error('❌ Ошибка создания политик RLS:', policyError);
    } else {
      console.log('✅ Политики RLS созданы');
    }
    
    console.log('\n🎉 Система рейтинга активности настроена успешно!');
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

createActivityTables();
