-- Функция для удаления подарка админом или звездой
-- Обходит RLS, проверяя права на уровне функции

CREATE OR REPLACE FUNCTION delete_item_by_user(
  item_id_param UUID,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_owner_id UUID;
  requesting_user_status TEXT;
BEGIN
  -- Получаем owner_id подарка
  SELECT owner_id INTO item_owner_id
  FROM items
  WHERE id = item_id_param;
  
  IF item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Получаем статус запрашивающего пользователя
  SELECT status INTO requesting_user_status
  FROM players
  WHERE id = requesting_user_id;
  
  -- Разрешаем удаление если:
  -- 1. Пользователь - владелец подарка (owner_id)
  -- 2. Пользователь - админ
  IF item_owner_id = requesting_user_id OR requesting_user_status = 'admin' THEN
    DELETE FROM items WHERE id = item_id_param;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Permission denied: user % cannot delete item owned by %', 
      requesting_user_id, item_owner_id;
  END IF;
  
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error deleting item: %', SQLERRM;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION delete_item_by_user(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_item_by_user(UUID, UUID) TO authenticated;



