-- Простое исправление RLS политик для удаления подарков администратором
-- Создаем функцию для удаления с правами администратора

-- Функция для удаления записи из музея (обходит RLS)
CREATE OR REPLACE FUNCTION delete_museum_item_admin(
  museum_item_id UUID,
  item_id UUID,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами создателя функции
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Проверяем, что пользователь - администратор
  SELECT EXISTS(
    SELECT 1 FROM players 
    WHERE id = admin_user_id 
    AND status = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Только администратор может использовать эту функцию';
  END IF;
  
  -- Удаляем запись из музея
  DELETE FROM player_museum WHERE id = museum_item_id;
  
  -- Удаляем предмет
  DELETE FROM items WHERE id = item_id;
  
  RETURN TRUE;
END;
$$;

-- Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION delete_museum_item_admin(UUID, UUID, UUID) TO authenticated;

-- Проверяем, что функция создана
SELECT 'Функция delete_museum_item_admin создана успешно' as status;





