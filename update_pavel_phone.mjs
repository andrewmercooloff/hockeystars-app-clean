import { createClient } from '@supabase/supabase-js';

// Настройки Supabase - замените на ваши реальные данные
const supabaseUrl = 'https://bqmjxvkiwczaqqmqjnpf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbWp4dmtpd2N6YXFxbXFqbnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5Mzk2MTUsImV4cCI6MjA0NzUxNTYxNX0.yQtw8roYcSYTGwCj6xkOcKvp2KnqyBpPbUMqJ6vR3h4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePavelTolstikPhone() {
  try {
    console.log('🔍 Поиск пользователя Pavel Tolstik...');

    // Сначала найдем пользователя Pavel Tolstik
    const { data: user, error: searchError } = await supabase
      .from('players')
      .select('*')
      .ilike('name', '%Pavel Tolstik%')
      .single();

    if (searchError || !user) {
      console.error('❌ Пользователь Pavel Tolstik не найден:', searchError);
      
      // Попробуем найти по вариантам имени
      console.log('🔍 Попробуем найти по другим вариантам имени...');
      const { data: users, error: allUsersError } = await supabase
        .from('players')
        .select('*')
        .or('name.ilike.%Pavel%,name.ilike.%Tolstik%');

      if (allUsersError) {
        console.error('❌ Ошибка поиска пользователей:', allUsersError);
        return;
      }

      console.log('📋 Найденные пользователи с похожими именами:');
      users?.forEach(user => {
        console.log(`- ID: ${user.id}, Имя: ${user.name}, Телефон: ${user.phone || 'нет'}`);
      });
      return;
    }

    console.log('✅ Пользователь найден:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Имя: ${user.name}`);
    console.log(`- Текущий телефон: ${user.phone || 'нет'}`);
    console.log(`- Email: ${user.email || 'нет'}`);
    console.log(`- Статус: ${user.status || 'player'}`);

    // Обновляем телефон
    const newPhone = '+375297079391';
    console.log(`📞 Обновляем телефон на: ${newPhone}`);

    const { data: updatedUser, error: updateError } = await supabase
      .from('players')
      .update({ phone: newPhone })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка обновления телефона:', updateError);
      return;
    }

    console.log('✅ Телефон успешно обновлен!');
    console.log(`- ID: ${updatedUser.id}`);
    console.log(`- Имя: ${updatedUser.name}`);
    console.log(`- Новый телефон: ${updatedUser.phone}`);
    
    // Проверим, что обновление прошло успешно
    console.log('🔍 Проверяем обновление...');
    const { data: checkUser, error: checkError } = await supabase
      .from('players')
      .select('*')
      .eq('phone', newPhone)
      .single();

    if (checkError || !checkUser) {
      console.error('❌ Проверка не прошла:', checkError);
      return;
    }

    console.log('✅ Проверка успешна! Пользователь может теперь входить по номеру:', newPhone);

  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

// Запускаем обновление
updatePavelTolstikPhone().then(() => {
  console.log('🏁 Скрипт завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
