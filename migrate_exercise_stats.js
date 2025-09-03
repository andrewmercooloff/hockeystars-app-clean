const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NTM0NjQsImV4cCI6MjA0ODAyOTQ2NH0.rMBVBWj6yCwEjLxWqmFqfR-EXZm4m0wRKGWcn3QQNL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateExerciseStats() {
  try {
    console.log('🔄 Начинаем миграцию колонки exercise_stats...');
    
    // Добавляем колонку exercise_stats
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE players 
        ADD COLUMN IF NOT EXISTS exercise_stats JSONB DEFAULT '{"completions":[],"totalCompletions":0}';
        
        -- Добавляем комментарий к колонке
        COMMENT ON COLUMN players.exercise_stats IS 'JSON статистика выполненных упражнений игрока';
        
        -- Создаем индекс для быстрого поиска по статистике упражнений
        CREATE INDEX IF NOT EXISTS idx_players_exercise_stats ON players USING GIN (exercise_stats);
      `
    });
    
    if (error) {
      console.error('❌ Ошибка выполнения миграции:', error);
      
      // Пробуем альтернативный способ через обычный запрос
      console.log('🔄 Пробуем альтернативный способ...');
      
      const { error: altError } = await supabase
        .from('players')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('❌ Ошибка подключения к базе данных:', altError);
        return;
      }
      
      console.log('✅ Подключение к базе данных работает');
      console.log('⚠️ Колонка exercise_stats должна быть добавлена вручную через SQL редактор Supabase');
      console.log('📝 Выполните следующий SQL в Supabase Dashboard:');
      console.log(`
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS exercise_stats JSONB DEFAULT '{"completions":[],"totalCompletions":0}';

COMMENT ON COLUMN players.exercise_stats IS 'JSON статистика выполненных упражнений игрока';

CREATE INDEX IF NOT EXISTS idx_players_exercise_stats ON players USING GIN (exercise_stats);
      `);
      
    } else {
      console.log('✅ Миграция выполнена успешно');
    }
    
    // Проверяем результат
    console.log('🔍 Проверяем структуру таблицы players...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'players' });
    
    if (columnsError) {
      console.log('⚠️ Не удалось получить информацию о колонках, но это не критично');
    } else {
      console.log('📊 Колонки таблицы players:', columns);
    }
    
    console.log('🎉 Миграция завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  }
}

// Запускаем миграцию
migrateExerciseStats();



