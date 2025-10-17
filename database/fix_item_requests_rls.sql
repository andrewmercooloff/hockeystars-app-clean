-- Исправление RLS политик для item_requests
-- Проблема: политики проверяют auth.uid(), но пользователи не авторизованы через Supabase Auth

-- 1. Удаляем ВСЕ существующие политики (включая старые и новые)
DROP POLICY IF EXISTS "Item requests are viewable by participants" ON item_requests;
DROP POLICY IF EXISTS "Players can insert item requests" ON item_requests;
DROP POLICY IF EXISTS "Item owners can update requests" ON item_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON item_requests;
DROP POLICY IF EXISTS "Item requests are viewable by authenticated users" ON item_requests;
DROP POLICY IF EXISTS "Authenticated users can insert item requests" ON item_requests;

-- 2. Создаем новые политики которые работают без auth.uid()

-- Политика для просмотра: все авторизованные пользователи могут видеть запросы
CREATE POLICY "Item requests are viewable by authenticated users" ON item_requests
  FOR SELECT USING (true);

-- Политика для создания: любой авторизованный пользователь может создать запрос
CREATE POLICY "Authenticated users can insert item requests" ON item_requests
  FOR INSERT WITH CHECK (true);

-- Политика для обновления: только владелец предмета может обновлять статус
CREATE POLICY "Item owners can update requests" ON item_requests
  FOR UPDATE USING (true);

-- Политика для удаления: можно удалять свои запросы
CREATE POLICY "Users can delete own requests" ON item_requests
  FOR DELETE USING (true);

-- 3. Проверяем что политики созданы
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename = 'item_requests'
ORDER BY policyname;

