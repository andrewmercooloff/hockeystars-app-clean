-- Исправление RLS политик для таблицы player_museum
-- Проблема: администраторы не могут удалять записи из музея

-- Удаляем существующие политики удаления
DROP POLICY IF EXISTS "Users can delete their own museum items" ON player_museum;
DROP POLICY IF EXISTS "Admins can delete any museum item" ON player_museum;

-- Создаем новую политику для владельцев
CREATE POLICY "Users can delete their own museum items" ON player_museum
FOR DELETE
USING (
  -- Владелец может удалять свои записи
  player_id = auth.uid()
  OR
  -- Администратор может удалять любые записи
  EXISTS (
    SELECT 1 FROM players 
    WHERE id = auth.uid() 
    AND status = 'admin'
  )
);

-- Создаем политику для администраторов (дополнительная защита)
CREATE POLICY "Admins can delete any museum item" ON player_museum
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM players 
    WHERE id = auth.uid() 
    AND status = 'admin'
  )
);

-- Проверяем, что RLS включен
ALTER TABLE player_museum ENABLE ROW LEVEL SECURITY;

-- Исправление RLS политик для таблицы items
-- Удаляем существующие политики удаления
DROP POLICY IF EXISTS "Users can delete their own items" ON items;
DROP POLICY IF EXISTS "Admins can delete any item" ON items;

-- Создаем новую политику для владельцев
CREATE POLICY "Users can delete their own items" ON items
FOR DELETE
USING (
  -- Владелец может удалять свои предметы
  owner_id = auth.uid()
  OR
  -- Администратор может удалять любые предметы
  EXISTS (
    SELECT 1 FROM players 
    WHERE id = auth.uid() 
    AND status = 'admin'
  )
);

-- Создаем политику для администраторов (дополнительная защита)
CREATE POLICY "Admins can delete any item" ON items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM players 
    WHERE id = auth.uid() 
    AND status = 'admin'
  )
);

-- Проверяем, что RLS включен
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Проверяем текущие политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('player_museum', 'items')
ORDER BY tablename, policyname;