const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createActivityTables() {
  try {
    console.log('🚀 Создаем таблицы для системы рейтинга активности...');
    
    // Создаем таблицу activity_points
    console.log('📊 Создаем таблицу activity_points...');
    const { error: pointsError } = await supabase
      .from('activity_points')
      .select('*')
      .limit(1);
    
    if (pointsError && pointsError.code === 'PGRST116') {
      console.log('❌ Таблица activity_points не существует, создаем...');
      
      // Попробуем создать через SQL Editor в Supabase Dashboard
      console.log('📝 Выполните следующий SQL в Supabase Dashboard > SQL Editor:');
      console.log(`
-- Создание таблицы activity_points
CREATE TABLE IF NOT EXISTS activity_points (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_activity_points_user_id ON activity_points(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_points_unique_user ON activity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);

-- Включение RLS
ALTER TABLE activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Политики RLS для activity_points
CREATE POLICY "Users can view own activity points" ON activity_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own activity points" ON activity_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity points" ON activity_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политики RLS для activity_log
CREATE POLICY "Users can view own activity log" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_activity_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_update_activity_points_updated_at
    BEFORE UPDATE ON activity_points
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_points_updated_at();
      `);
      
      console.log('\n✅ Скопируйте и выполните SQL выше в Supabase Dashboard');
      console.log('🔗 Откройте: https://supabase.com/dashboard/project/jvsypfwiajuwsyuzkyda/sql');
      
    } else if (pointsError) {
      console.error('❌ Ошибка проверки таблицы activity_points:', pointsError);
    } else {
      console.log('✅ Таблица activity_points уже существует');
    }
    
    // Проверяем таблицу activity_log
    console.log('📊 Проверяем таблицу activity_log...');
    const { error: logError } = await supabase
      .from('activity_log')
      .select('*')
      .limit(1);
    
    if (logError && logError.code === 'PGRST116') {
      console.log('❌ Таблица activity_log не существует');
    } else if (logError) {
      console.error('❌ Ошибка проверки таблицы activity_log:', logError);
    } else {
      console.log('✅ Таблица activity_log уже существует');
    }
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

createActivityTables();
