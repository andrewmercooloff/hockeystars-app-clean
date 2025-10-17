-- Исправление RLS политик для удаления подарков из музея
-- Проблема: DELETE возвращает пустой массив - политика блокирует удаление

-- Удаляем все существующие политики для DELETE на player_museum
DROP POLICY IF EXISTS "Users can delete their own museum items" ON player_museum;
DROP POLICY IF EXISTS "Admins can delete any museum item" ON player_museum;
DROP POLICY IF EXISTS "Players can delete museum items" ON player_museum;
DROP POLICY IF EXISTS "Allow delete for owner and admin" ON player_museum;

-- Создаем одну универсальную политику для удаления
-- Разрешает удаление если:
-- 1. Текущий пользователь - владелец подарка (player_id)
-- 2. Текущий пользователь - администратор
CREATE POLICY "Allow delete museum items" ON player_museum
FOR DELETE
USING (
  -- Владелец может удалять свои записи
  auth.uid()::text = player_id::text
  OR
  -- Администратор может удалять любые записи
  EXISTS (
    SELECT 1 FROM players 
    WHERE id::text = auth.uid()::text
    AND status = 'admin'
  )
);

-- Проверяем что RLS включен
ALTER TABLE player_museum ENABLE ROW LEVEL SECURITY;

-- Проверка созданных политик
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'player_museum' 
ORDER BY cmd;



