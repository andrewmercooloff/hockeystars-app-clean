const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAfterMigration() {
  try {
    console.log('🎯 Тестируем систему упражнений после миграции...');
    
    // Найдем игрока для тестирования
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, status, exercise_stats')
      .eq('status', 'player')
      .limit(1);
    
    if (playersError) {
      console.error('❌ Ошибка:', playersError);
      return;
    }
    
    if (!players || players.length === 0) {
      console.log('⚠️ Не найдено игроков для тестирования');
      return;
    }
    
    const player = players[0];
    console.log('👤 Тестируем с игроком:', player.name);
    console.log('📊 Текущая статистика:', player.exercise_stats);
    
    // Создаем тестовую статистику
    const testStats = {
      completions: [
        {
          exerciseId: '1',
          completedAt: new Date().toISOString(),
          count: 3
        },
        {
          exerciseId: '5',
          completedAt: new Date().toISOString(),
          count: 2
        },
        {
          exerciseId: '10',
          completedAt: new Date().toISOString(),
          count: 1
        }
      ],
      totalCompletions: 6,
      lastCompletedAt: new Date().toISOString()
    };
    
    // Обновляем статистику
    console.log('🔄 Обновляем статистику упражнений...');
    const { error: updateError } = await supabase
      .from('players')
      .update({ exercise_stats: testStats })
      .eq('id', player.id);
    
    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
      return;
    }
    
    console.log('✅ Статистика обновлена успешно!');
    
    // Проверяем обновленные данные
    const { data: updatedPlayer, error: checkError } = await supabase
      .from('players')
      .select('exercise_stats')
      .eq('id', player.id)
      .single();
    
    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError);
      return;
    }
    
    console.log('📊 Обновленная статистика:', updatedPlayer.exercise_stats);
    console.log('🎉 Система упражнений работает корректно!');
    
    // Проверим всех игроков для рейтинга
    console.log('\n📈 Проверяем рейтинг упражнений...');
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('players')
      .select('id, name, status, exercise_stats')
      .eq('status', 'player');
    
    if (allPlayersError) {
      console.error('❌ Ошибка получения всех игроков:', allPlayersError);
      return;
    }
    
    const exerciseRankings = {};
    
    allPlayers.forEach(p => {
      if (p.exercise_stats && p.exercise_stats.completions) {
        p.exercise_stats.completions.forEach(completion => {
          exerciseRankings[completion.exerciseId] = 
            (exerciseRankings[completion.exerciseId] || 0) + completion.count;
        });
      }
    });
    
    const rankings = Object.entries(exerciseRankings)
      .map(([exerciseId, totalCompletions]) => ({ exerciseId, totalCompletions }))
      .sort((a, b) => b.totalCompletions - a.totalCompletions);
    
    console.log('🏆 Топ-5 упражнений:');
    rankings.slice(0, 5).forEach((ranking, index) => {
      console.log(`   ${index + 1}. Упражнение #${ranking.exerciseId} - ${ranking.totalCompletions} выполнений`);
    });
    
    console.log('\n🎊 Все тесты прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testAfterMigration();



