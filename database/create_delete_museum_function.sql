-- Создаем функцию для удаления подарков из музея с проверкой прав
-- Эта функция будет работать с SECURITY DEFINER, обходя RLS

CREATE OR REPLACE FUNCTION delete_museum_item_by_user(
  museum_item_id UUID,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами владельца функции (суперпользователь)
AS $$
DECLARE
  museum_player_id UUID;
  requesting_user_status TEXT;
BEGIN
  -- Получаем player_id из museum записи
  SELECT player_id INTO museum_player_id
  FROM player_museum
  WHERE id = museum_item_id;
  
  -- Если запись не найдена
  IF museum_player_id IS NULL THEN
    RAISE EXCEPTION 'Museum item not found';
  END IF;
  
  -- Получаем статус запрашивающего пользователя
  SELECT status INTO requesting_user_status
  FROM players
  WHERE id = requesting_user_id;
  
  -- Проверяем права:
  -- 1. Пользователь - владелец подарка
  -- 2. Пользователь - администратор
  IF museum_player_id = requesting_user_id OR requesting_user_status = 'admin' THEN
    -- Удаляем запись
    DELETE FROM player_museum WHERE id = museum_item_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Permission denied: user % cannot delete item for player %', 
      requesting_user_id, museum_player_id;
  END IF;
  
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error deleting museum item: %', SQLERRM;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION delete_museum_item_by_user(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_museum_item_by_user(UUID, UUID) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION delete_museum_item_by_user IS 
'Удаляет подарок из музея игрока с проверкой прав доступа. Обходит RLS политики.';



