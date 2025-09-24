const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTeamsStatus() {
  console.log('🔍 Проверка статуса таблиц команд...');
  
  try {
    // Проверяем таблицу teams
    console.log('\n📋 Проверка таблицы teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(5);
    
    if (teamsError) {
      console.log('❌ Таблица teams не существует:', teamsError.message);
    } else {
      console.log('✅ Таблица teams существует!');
      console.log(`📊 Количество команд: ${teams.length}`);
      if (teams.length > 0) {
        console.log('🏒 Примеры команд:');
        teams.forEach(team => {
          console.log(`   - ${team.name} (${team.type})`);
        });
      }
    }
    
    // Проверяем таблицу player_teams
    console.log('\n📋 Проверка таблицы player_teams...');
    const { data: playerTeams, error: playerTeamsError } = await supabase
      .from('player_teams')
      .select('*')
      .limit(5);
    
    if (playerTeamsError) {
      console.log('❌ Таблица player_teams не существует:', playerTeamsError.message);
    } else {
      console.log('✅ Таблица player_teams существует!');
      console.log(`📊 Количество связей игрок-команда: ${playerTeams.length}`);
    }
    
    // Проверяем функции
    console.log('\n🔧 Проверка функций...');
    
    // Проверяем функцию search_teams
    try {
      const { data: searchResult, error: searchError } = await supabase
        .rpc('search_teams', { search_term: 'Динамо' });
      
      if (searchError) {
        console.log('❌ Функция search_teams не найдена:', searchError.message);
      } else {
        console.log('✅ Функция search_teams работает!');
        console.log(`🔍 Результат поиска "Динамо": ${searchResult.length} команд`);
      }
    } catch (err) {
      console.log('❌ Ошибка вызова search_teams:', err.message);
    }
    
    // Проверяем функцию get_player_teams
    try {
      const { data: playerTeamsResult, error: playerTeamsFuncError } = await supabase
        .rpc('get_player_teams', { player_uuid: '00000000-0000-0000-0000-000000000000' });
      
      if (playerTeamsFuncError) {
        console.log('❌ Функция get_player_teams не найдена:', playerTeamsFuncError.message);
      } else {
        console.log('✅ Функция get_player_teams работает!');
        console.log(`👤 Результат для тестового игрока: ${playerTeamsResult.length} команд`);
      }
    } catch (err) {
      console.log('❌ Ошибка вызова get_player_teams:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkTeamsStatus().then(() => {
  console.log('\n📋 Резюме:');
  console.log('Если таблицы не существуют, нужно выполнить SQL скрипт через Supabase Dashboard');
  console.log('Файл: database/add_teams_support.sql');
}); 