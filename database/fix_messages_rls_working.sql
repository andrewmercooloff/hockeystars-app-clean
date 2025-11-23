-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES (РАБОЧАЯ ВЕРСИЯ)
-- ============================================
-- Сообщения есть в таблице, но RLS политики их блокируют
-- Этот скрипт исправляет политики для правильной работы

-- Удаляем ВСЕ существующие политики
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

-- 1. Политика для SELECT - пользователи могут читать сообщения, где они отправитель или получатель
-- Используем простое сравнение UUID (без приведения к text)
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 2. Политика для INSERT - аутентифицированные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- 3. Политика для UPDATE - получатель может помечать как прочитанное
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 4. Политика для DELETE - только отправитель может удалять
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
  );

-- Проверяем результат
SELECT 
  'Политики RLS созданы!' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;









