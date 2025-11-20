/**
 * Скрипт для исправления статуса пользователя Merky
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMerkyStatus() {
  console.log('🔧 Исправляю статус пользователя Merky...\n');
  
  const playerId = 'b8fa8412-4701-4893-bd97-e38aabf95079';
  
  // Обновляем статус на 'player'
  const { data, error } = await supabase
    .from('players')
    .update({ status: 'player' })
    .eq('id', playerId)
    .select('id, name, status, avatar')
    .single();
  
  if (error) {
    console.error('❌ Ошибка обновления:', error);
    return;
  }
  
  console.log('✅ Статус обновлен:');
  console.log(`   ID: ${data.id}`);
  console.log(`   Имя: ${data.name}`);
  console.log(`   Статус: ${data.status}`);
  console.log(`   Аватар: ${data.avatar || 'НЕТ ФОТО'}`);
  console.log('\n⚠️  Аватар все еще отсутствует. Проверьте, правильно ли сохраняется фото при регистрации.');
}

fixMerkyStatus().catch(console.error);

