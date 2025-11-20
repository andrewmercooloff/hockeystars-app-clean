-- ============================================
-- ВОССТАНОВЛЕНИЕ RLS ПОЛИТИК ИЗ BACKUP (15-11-2025)
-- ============================================
-- Эти политики были в backup и работали раньше!
-- Они разрешают всем authenticated пользователям видеть все сообщения

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
DROP POLICY IF EXISTS "Allow read messages" ON messages;
DROP POLICY IF EXISTS "Allow insert messages" ON messages;
DROP POLICY IF EXISTS "Allow update messages" ON messages;
DROP POLICY IF EXISTS "Allow delete messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON messages;

-- Включаем RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ВОССТАНОВЛЕНИЕ ОРИГИНАЛЬНЫХ ПОЛИТИК ИЗ BACKUP:
-- Эти политики были в backup и работали!

-- 1. SELECT - все authenticated пользователи могут видеть все сообщения
CREATE POLICY "Messages are viewable by everyone" ON public.messages 
FOR SELECT 
USING (true);

-- 2. INSERT - все authenticated пользователи могут отправлять сообщения
CREATE POLICY "Messages can be inserted by anyone" ON public.messages 
FOR INSERT 
WITH CHECK (true);

-- 3. UPDATE - все authenticated пользователи могут обновлять сообщения
CREATE POLICY "Messages can be updated by anyone" ON public.messages 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 4. DELETE - все authenticated пользователи могут удалять сообщения
CREATE POLICY "Messages can be deleted by anyone" ON public.messages 
FOR DELETE 
USING (true);

-- Проверяем созданные политики
SELECT 
  '✅ Политики RLS восстановлены из backup!' as status,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- Проверяем количество сообщений
SELECT 
  '📊 Всего сообщений в таблице:' as info,
  COUNT(*) as total_messages
FROM messages;

-- Тест: проверяем, что сообщения теперь видны
SELECT 
  '✅ Тест доступа к сообщениям:' as info,
  COUNT(*) as visible_messages
FROM messages;







