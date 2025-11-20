-- ============================================
-- ВОССТАНОВЛЕНИЕ ОРИГИНАЛЬНЫХ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Восстанавливает политики на основе setup_messages_table.sql
-- С исправлением для UPDATE (получатель может помечать как прочитанное)

-- Удаляем ВСЕ существующие политики для messages
DROP POLICY IF EXISTS "Users can read their messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Messages are viewable by participants" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON messages;
DROP POLICY IF EXISTS "Messages can be inserted by anyone" ON messages;
DROP POLICY IF EXISTS "Messages can be updated by anyone" ON messages;
DROP POLICY IF EXISTS "Messages can be deleted by anyone" ON messages;

-- Включаем RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. Политика для чтения сообщений (оригинальная, с ::text)
-- Пользователь может читать сообщения, где он отправитель или получатель
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = receiver_id::text
  );

-- 2. Политика для отправки сообщений (оригинальная)
-- Авторизованные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid()::text = sender_id::text
  );

-- 3. Политика для обновления сообщений (ИСПРАВЛЕНА)
-- Пользователь может обновлять свои сообщения (отправитель) ИЛИ помечать как прочитанные (получатель)
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = receiver_id::text
  )
  WITH CHECK (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = receiver_id::text
  );

-- 4. Политика для удаления сообщений (оригинальная)
-- Пользователь может удалять только свои сообщения (отправитель)
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = sender_id::text
  );

-- Проверяем результат
SELECT 
  'Политики RLS для messages восстановлены (оригинальные с исправлением UPDATE)!' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;








