-- Функция для удаления собственного аккаунта
-- Позволяет пользователю удалить свой аккаунт, обходя RLS политики
-- Проверяет, что пользователь удаляет именно свой аккаунт

CREATE OR REPLACE FUNCTION delete_own_account(
  player_id_param UUID,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Получаем ID текущего пользователя из auth или из параметра
  current_user_id := COALESCE(auth.uid(), requesting_user_id);
  
  -- Проверяем, что пользователь удаляет именно свой аккаунт
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id != player_id_param OR requesting_user_id != player_id_param THEN
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
    -- Игнорируем ошибки, если таблица не существует
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
GRANT EXECUTE ON FUNCTION delete_own_account(UUID, UUID) TO authenticated;

