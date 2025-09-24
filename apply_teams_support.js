const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyTeamsSupport() {
  try {
    console.log('🚀 Применение поддержки команд к базе данных...');
    
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'database', 'add_teams_support.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL файл прочитан, размер:', sqlContent.length, 'символов');
    
    // Разбиваем SQL на отдельные команды
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log('🔧 Найдено SQL команд:', sqlCommands.length);
    
    // Выполняем команды по очереди
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`\n📝 Выполнение команды ${i + 1}/${sqlCommands.length}:`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: command });
          
          if (error) {
            console.error(`❌ Ошибка в команде ${i + 1}:`, error);
            // Продолжаем выполнение других команд
          } else {
            console.log(`✅ Команда ${i + 1} выполнена успешно`);
          }
        } catch (err) {
          console.error(`❌ Исключение в команде ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Применение SQL команд завершено!');
    
    // Проверяем, что таблицы созданы
    console.log('\n🔍 Проверка созданных таблиц...');
    
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('count')
      .limit(1);
    
    if (teamsError) {
      console.error('❌ Таблица teams не найдена:', teamsError);
    } else {
      console.log('✅ Таблица teams создана успешно');
    }
    
    const { data: playerTeamsData, error: playerTeamsError } = await supabase
      .from('player_teams')
      .select('count')
      .limit(1);
    
    if (playerTeamsError) {
      console.error('❌ Таблица player_teams не найдена:', playerTeamsError);
    } else {
      console.log('✅ Таблица player_teams создана успешно');
    }
    
    // Проверяем количество команд
    const { data: teamsCount, error: countError } = await supabase
      .from('teams')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Ошибка подсчета команд:', countError);
    } else {
      console.log(`✅ В базе данных ${teamsCount.length} команд`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Альтернативный метод - выполнение через SQL Editor
async function checkDatabaseStatus() {
  try {
    console.log('🔍 Проверка статуса базы данных...');
    
    // Проверяем существующие таблицы
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Ошибка получения списка таблиц:', tablesError);
    } else {
      console.log('📋 Существующие таблицы:');
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
    // Проверяем, есть ли уже таблица teams
    const teamsExists = tables?.some(table => table.table_name === 'teams');
    
    if (teamsExists) {
      console.log('⚠️  Таблица teams уже существует!');
      
      // Проверяем количество команд
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*');
      
      if (teamsError) {
        console.error('❌ Ошибка получения команд:', teamsError);
      } else {
        console.log(`✅ В таблице teams ${teams.length} записей`);
        if (teams.length > 0) {
          console.log('📝 Примеры команд:');
          teams.slice(0, 5).forEach(team => {
            console.log(`   - ${team.name} (${team.type})`);
          });
        }
      }
    } else {
      console.log('❌ Таблица teams не найдена. Нужно выполнить SQL скрипт.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error);
  }
}

// Запускаем проверку
checkDatabaseStatus().then(() => {
  console.log('\n💡 Для применения SQL изменений:');
  console.log('1. Откройте Supabase Dashboard');
  console.log('2. Перейдите в SQL Editor');
  console.log('3. Скопируйте содержимое файла database/add_teams_support.sql');
  console.log('4. Выполните SQL команды');
  console.log('\n📄 Содержимое SQL файла:');
  console.log('='.repeat(50));
  
  const sqlPath = path.join(__dirname, 'database', 'add_teams_support.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
  } else {
    console.log('❌ SQL файл не найден');
  }
}); 