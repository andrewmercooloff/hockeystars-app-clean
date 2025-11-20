/**
 * Скрипт для проверки и исправления проблемы с пользователем Merky
 * Использует Supabase API для прямого доступа к базе данных
 * 
 * Запуск: node scripts/check-and-fix-merky.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMerky() {
  console.log('🔍 Проверяю пользователей с телефоном +375297730000...\n');
  
  // 1. Проверяем всех пользователей с этим телефоном
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, phone, status, avatar, created_at, updated_at')
    .eq('phone', '+375297730000')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Ошибка при запросе:', error);
    return;
  }
  
  if (!players || players.length === 0) {
    console.log('✅ Пользователей с этим телефоном не найдено');
    return;
  }
  
  console.log(`📊 Найдено пользователей: ${players.length}\n`);
  
  players.forEach((player, index) => {
    console.log(`--- Пользователь #${index + 1} ---`);
    console.log(`ID: ${player.id}`);
    console.log(`Имя: ${player.name}`);
    console.log(`Статус: ${player.status}`);
    console.log(`Аватар: ${player.avatar || 'НЕТ ФОТО'}`);
    console.log(`Создан: ${player.created_at}`);
    console.log(`Обновлен: ${player.updated_at}`);
    console.log('');
  });
  
  // 2. Если есть несколько пользователей, показываем рекомендации
  if (players.length > 1) {
    console.log('⚠️  Обнаружены дубликаты!\n');
    console.log('Рекомендации:');
    console.log(`- Оставить пользователя: ${players[0].name} (ID: ${players[0].id}) - самый новый`);
    console.log(`- Удалить пользователей:`);
    players.slice(1).forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (ID: ${player.id}, статус: ${player.status})`);
    });
    console.log('\n');
    
    // 3. Спрашиваем, нужно ли удалить дубликаты
    console.log('Для удаления дубликатов раскомментируйте код ниже в скрипте и запустите снова.\n');
    
    // Раскомментируйте для автоматического удаления дубликатов:
    /*
    console.log('🗑️  Удаляю старые дубликаты...');
    const idsToDelete = players.slice(1).map(p => p.id);
    
    for (const id of idsToDelete) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error(`❌ Ошибка удаления ${id}:`, deleteError);
      } else {
        console.log(`✅ Удален пользователь с ID: ${id}`);
      }
    }
    */
    
    // 4. Обновляем статус и аватар для правильного пользователя (если нужно)
    const correctPlayer = players[0];
    const needsUpdate = correctPlayer.status !== 'player' || !correctPlayer.avatar;
    
    if (needsUpdate) {
      console.log('📝 Обновляю данные правильного пользователя...');
      const updates = {};
      
      if (correctPlayer.status !== 'player') {
        updates.status = 'player';
        console.log(`  - Статус: ${correctPlayer.status} → player`);
      }
      
      // Если нужно обновить аватар, раскомментируйте:
      // if (!correctPlayer.avatar) {
      //   updates.avatar = 'URL_ФОТО_ЗДЕСЬ';
      //   console.log('  - Добавляю аватар');
      // }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('players')
          .update(updates)
          .eq('id', correctPlayer.id);
        
        if (updateError) {
          console.error('❌ Ошибка обновления:', updateError);
        } else {
          console.log('✅ Данные обновлены');
        }
      }
    }
  } else {
    // Если только один пользователь, проверяем его данные
    const player = players[0];
    console.log('✅ Дубликатов не найдено\n');
    
    if (player.status !== 'player') {
      console.log(`⚠️  Статус пользователя: ${player.status} (ожидается: player)`);
      console.log('Для исправления раскомментируйте код обновления выше.\n');
    }
    
    if (!player.avatar) {
      console.log('⚠️  У пользователя нет аватара');
      console.log('Для добавления аватара раскомментируйте код обновления выше.\n');
    }
  }
  
  // 5. Проверяем все дубликаты в базе
  console.log('🔍 Проверяю все дубликаты по телефону в базе...\n');
  
  const { data: allDuplicates, error: dupError } = await supabase
    .rpc('check_duplicate_phones'); // Если есть такая функция
  
  // Альтернативный способ - через обычный запрос
  const { data: allPlayers, error: allError } = await supabase
    .from('players')
    .select('phone, id, name, status, created_at')
    .not('phone', 'is', null)
    .neq('phone', '');
  
  if (!allError && allPlayers) {
    const phoneGroups = {};
    allPlayers.forEach(player => {
      if (!phoneGroups[player.phone]) {
        phoneGroups[player.phone] = [];
      }
      phoneGroups[player.phone].push(player);
    });
    
    const duplicates = Object.entries(phoneGroups)
      .filter(([phone, players]) => players.length > 1)
      .map(([phone, players]) => ({ phone, players, count: players.length }));
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Найдено ${duplicates.length} телефонов с дубликатами:\n`);
      duplicates.forEach(({ phone, players, count }) => {
        console.log(`Телефон: ${phone} (${count} пользователей)`);
        players.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.status}) - ${p.id} - создан: ${p.created_at}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ Других дубликатов не найдено');
    }
  }
}

// Запускаем проверку
checkMerky().catch(console.error);

