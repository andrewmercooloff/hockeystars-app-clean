import { supabase } from '../utils/supabase';

async function updatePhones() {
  try {
    // Находим тестового пользователя
    const { data: testUser, error: testError } = await supabase
      .from('players')
      .select('*')
      .eq('name', 'TEST')
      .single();

    if (testError || !testUser) {
      console.error('Не найден тестовый пользователь');
      return;
    }

    // Находим администратора
    const { data: adminUser, error: adminError } = await supabase
      .from('players')
      .select('*')
      .eq('name', 'Администратор')
      .single();

    if (adminError || !adminUser) {
      console.error('Не найден администратор');
      return;
    }

    // Обновляем телефон тестового пользователя
    const { data: updatedTestUser, error: testUpdateError } = await supabase
      .from('players')
      .update({ phone: '+380123456789' })
      .eq('id', testUser.id)
      .select()
      .single();

    if (testUpdateError) {
      console.error('Ошибка обновления телефона тестового пользователя:', testUpdateError);
      return;
    }

    // Обновляем телефон администратора
    const { data: updatedAdminUser, error: adminUpdateError } = await supabase
      .from('players')
      .update({ phone: '+375296549728' })
      .eq('id', adminUser.id)
      .select()
      .single();

    if (adminUpdateError) {
      console.error('Ошибка обновления телефона администратора:', adminUpdateError);
      return;
    }

    console.log('Телефон тестового пользователя обновлен:', updatedTestUser);
    console.log('Телефон администратора обновлен:', updatedAdminUser);

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

updatePhones();
