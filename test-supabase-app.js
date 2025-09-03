const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAppIntegration() {
  console.log('🔧 Тестирование интеграции приложения с Supabase...');
  
  try {
    // Тест 1: Создание тестового игрока
    console.log('👤 Создание тестового игрока...');
    const testPlayer = {
      name: 'Тестовый Хоккеист',
      position: 'Нападающий',
      team: 'Тестовая Команда',
      age: 25,
      height: 180,
      weight: 80,
      email: 'hockey@test.com',
      password: 'test123',
      status: 'user',
      city: 'Минск',
      goals: 10,
      assists: 15,
      games: 20,
      pull_ups: 15,
      push_ups: 30,
      plank_time: 60,
      sprint_100m: 12.5,
      long_jump: 250
    };
    
    const { data: newPlayer, error: insertError } = await supabase
      .from('players')
      .insert([testPlayer])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Ошибка создания игрока:', insertError.message);
      return false;
    }
    
    console.log('✅ Игрок создан:', newPlayer.name, '(ID:', newPlayer.id + ')');
    
    // Тест 2: Создание второго игрока для тестирования дружбы
    console.log('👤 Создание второго игрока...');
    const testPlayer2 = {
      name: 'Второй Хоккеист',
      position: 'Защитник',
      team: 'Другая Команда',
      age: 28,
      height: 185,
      weight: 85,
      email: 'hockey2@test.com',
      password: 'test456',
      status: 'user',
      city: 'Гомель',
      goals: 5,
      assists: 20,
      games: 25,
      pull_ups: 20,
      push_ups: 35,
      plank_time: 90,
      sprint_100m: 13.0,
      long_jump: 260
    };
    
    const { data: newPlayer2, error: insertError2 } = await supabase
      .from('players')
      .insert([testPlayer2])
      .select()
      .single();
    
    if (insertError2) {
      console.error('❌ Ошибка создания второго игрока:', insertError2.message);
      return false;
    }
    
    console.log('✅ Второй игрок создан:', newPlayer2.name, '(ID:', newPlayer2.id + ')');
    
    // Тест 3: Отправка запроса дружбы
    console.log('🤝 Отправка запроса дружбы...');
    const { data: friendRequest, error: friendError } = await supabase
      .from('friend_requests')
      .insert([{
        from_id: newPlayer.id,
        to_id: newPlayer2.id,
        status: 'pending'
      }])
      .select()
      .single();
    
    if (friendError) {
      console.error('❌ Ошибка отправки запроса дружбы:', friendError.message);
      return false;
    }
    
    console.log('✅ Запрос дружбы отправлен (ID:', friendRequest.id + ')');
    
    // Тест 4: Отправка сообщения
    console.log('💬 Отправка сообщения...');
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert([{
        sender_id: newPlayer.id,
        receiver_id: newPlayer2.id,
        text: 'Привет! Как дела?',
        read: false
      }])
      .select()
      .single();
    
    if (messageError) {
      console.error('❌ Ошибка отправки сообщения:', messageError.message);
      return false;
    }
    
    console.log('✅ Сообщение отправлено (ID:', message.id + ')');
    
    // Тест 5: Получение всех данных
    console.log('📊 Получение всех данных...');
    
    // Получаем всех игроков
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (playersError) {
      console.error('❌ Ошибка получения игроков:', playersError.message);
      return false;
    }
    
    console.log('✅ Игроки получены:', players.length);
    players.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name} (${player.email}) - ${player.status}`);
    });
    
    // Получаем запросы дружбы
    const { data: friendRequests, error: friendRequestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (friendRequestsError) {
      console.error('❌ Ошибка получения запросов дружбы:', friendRequestsError.message);
      return false;
    }
    
    console.log('✅ Запросы дружбы получены:', friendRequests.length);
    
    // Получаем сообщения
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (messagesError) {
      console.error('❌ Ошибка получения сообщений:', messagesError.message);
      return false;
    }
    
    console.log('✅ Сообщения получены:', messages.length);
    
    // Тест 6: Принятие запроса дружбы
    console.log('✅ Принятие запроса дружбы...');
    const { error: acceptError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', friendRequest.id);
    
    if (acceptError) {
      console.error('❌ Ошибка принятия запроса дружбы:', acceptError.message);
      return false;
    }
    
    console.log('✅ Запрос дружбы принят');
    
    // Тест 7: Создание уведомления
    console.log('🔔 Создание уведомления...');
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: newPlayer2.id,
        type: 'friend_request_accepted',
        title: 'Запрос дружбы принят',
        message: `${newPlayer.name} принял ваш запрос дружбы`,
        is_read: false
      }])
      .select()
      .single();
    
    if (notificationError) {
      console.error('❌ Ошибка создания уведомления:', notificationError.message);
      return false;
    }
    
    console.log('✅ Уведомление создано (ID:', notification.id + ')');
    
    console.log('🎉 Все тесты интеграции пройдены успешно!');
    console.log('📋 Итоговая статистика:');
    console.log(`  - Игроков: ${players.length}`);
    console.log(`  - Запросов дружбы: ${friendRequests.length}`);
    console.log(`  - Сообщений: ${messages.length}`);
    console.log(`  - Уведомлений: ${1}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
    return false;
  }
}

// Запуск теста
if (require.main === module) {
  testAppIntegration().then(success => {
    if (success) {
      console.log('🚀 Приложение готово к интеграции с Supabase!');
      process.exit(0);
    } else {
      console.log('💥 Тестирование интеграции не прошло');
      process.exit(1);
    }
  });
}

module.exports = { testAppIntegration }; 