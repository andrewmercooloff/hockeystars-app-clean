const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExerciseSystem() {
  try {
    console.log('🧪 Тестируем систему упражнений...');
    
    // 1. Проверяем подключение к базе данных
    console.log('🔍 Проверяем подключение к базе данных...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, status')
      .limit(3);
    
    if (playersError) {
      console.error('❌ Ошибка подключения:', playersError);
      return;
    }
    
    console.log('✅ Подключение работает. Найдено игроков:', players.length);
    
    // 2. Ищем игроков (не тренеров/скаутов)
    const player = players.find(p => p.status === 'player');
    if (!player) {
      console.log('⚠️ Не найдено игроков для тестирования');
      return;
    }
    
    console.log('👤 Тестируем с игроком:', player.name);
    
    // 3. Проверяем, есть ли колонка exercise_stats
    console.log('🔍 Проверяем наличие колонки exercise_stats...');
    const { data: playerWithStats, error: statsError } = await supabase
      .from('players')
      .select('id, name, exercise_stats')
      .eq('id', player.id)
      .single();
    
    if (statsError) {
      if (statsError.message.includes('column "exercise_stats" does not exist')) {
        console.log('⚠️ Колонка exercise_stats не существует в базе данных');
        console.log('📝 Нужно добавить колонку в Supabase Dashboard:');
        console.log('ALTER TABLE players ADD COLUMN exercise_stats JSONB DEFAULT \'{"completions":[],"totalCompletions":0}\';');
        return;
      } else {
        console.error('❌ Ошибка получения данных:', statsError);
        return;
      }
    }
    
    console.log('✅ Колонка exercise_stats существует');
    console.log('📊 Текущие данные:', playerWithStats.exercise_stats);
    
    // 4. Тестируем обновление статистики упражнений
    console.log('🔄 Тестируем обновление статистики...');
    
    const mockExerciseStats = {
      completions: [
        {
          exerciseId: '1',
          completedAt: new Date().toISOString(),
          count: 1
        }
      ],
      totalCompletions: 1,
      lastCompletedAt: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('players')
      .update({ exercise_stats: mockExerciseStats })
      .eq('id', player.id);
    
    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
      return;
    }
    
    console.log('✅ Статистика упражнений обновлена успешно');
    
    // 5. Проверяем обновленные данные
    const { data: updatedPlayer, error: checkError } = await supabase
      .from('players')
      .select('exercise_stats')
      .eq('id', player.id)
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError);
      return;
    }
    
    console.log('✅ Проверка обновленных данных:', updatedPlayer.exercise_stats);
    
    console.log('🎉 Система упражнений работает корректно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testExerciseSystem();
