// Скрипт для применения функции удаления собственного аккаунта
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sql = `
-- Функция для удаления собственного аккаунта
CREATE OR REPLACE FUNCTION delete_own_account(
  player_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Получаем ID текущего пользователя
  current_user_id := auth.uid();
  
  -- Проверяем, что пользователь удаляет именно свой аккаунт
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id != player_id_param THEN
    RAISE EXCEPTION 'Permission denied: you can only delete your own account';
  END IF;
  
  -- Удаляем связанные данные
  DELETE FROM notifications WHERE user_id = player_id_param;
  DELETE FROM messages WHERE sender_id = player_id_param OR receiver_id = player_id_param;
  DELETE FROM friend_requests WHERE from_id = player_id_param OR to_id = player_id_param;
  DELETE FROM player_teams WHERE player_id = player_id_param;
  
  -- Удаляем статистику упражнений, если таблица существует
  BEGIN
    DELETE FROM exercise_completions WHERE player_id = player_id_param;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Удаляем записи из дополнительных таблиц
  BEGIN
    DELETE FROM player_museum WHERE player_id = player_id_param;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DELETE FROM photos WHERE player_id = player_id_param;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DELETE FROM videos WHERE player_id = player_id_param;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    DELETE FROM blocked_users WHERE blocker_id = player_id_param OR blocked_id = player_id_param;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- Удаляем самого игрока
  DELETE FROM players WHERE id = player_id_param;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting account: %', SQLERRM;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION delete_own_account(UUID) TO authenticated;
`;

async function applyMigration() {
  try {
    console.log('🔄 Применяем функцию delete_own_account...');
    
    // Выполняем SQL через RPC или напрямую
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Если RPC не работает, пробуем через прямой запрос
      console.log('⚠️ RPC не сработал, пробуем другой способ...');
      // К сожалению, Supabase JS не поддерживает прямое выполнение SQL
      // Нужно использовать Dashboard или CLI
      console.log('❌ Не удалось применить через JS клиент');
      console.log('📋 Пожалуйста, выполните SQL вручную через Supabase Dashboard:');
      console.log('\n' + sql);
      return;
    }
    
    console.log('✅ Функция успешно создана!');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    console.log('📋 Пожалуйста, выполните SQL вручную через Supabase Dashboard:');
    console.log('\n' + sql);
  }
}

applyMigration();

