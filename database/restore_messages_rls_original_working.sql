-- ============================================
-- ВОССТАНОВЛЕНИЕ ОРИГИНАЛЬНЫХ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Восстанавливает оригинальные политики из setup_messages_table.sql
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

-- 1. Политика для чтения сообщений (ОРИГИНАЛЬНАЯ)
-- Пользователь может читать сообщения, где он отправитель или получатель
CREATE POLICY "Users can read their messages" ON public.messages
FOR SELECT USING (
  auth.uid()::text = sender_id::text OR 
  auth.uid()::text = receiver_id::text
);

-- 2. Политика для отправки сообщений (ОРИГИНАЛЬНАЯ)
-- Авторизованные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid()::text = sender_id::text
);

-- 3. Политика для обновления сообщений (ИСПРАВЛЕННАЯ)
-- Отправитель может обновлять свои сообщения
-- Получатель может помечать сообщения как прочитанные (обновлять поле read)
CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (
  auth.uid()::text = sender_id::text OR
  auth.uid()::text = receiver_id::text
)
WITH CHECK (
  auth.uid()::text = sender_id::text OR
  auth.uid()::text = receiver_id::text
);

-- 4. Политика для удаления сообщений (ОРИГИНАЛЬНАЯ)
-- Пользователь может удалять только свои сообщения
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (
  auth.uid()::text = sender_id::text
);

-- Проверяем созданные политики
SELECT 
  '✅ Оригинальные политики RLS восстановлены!' as status,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- Проверяем количество сообщений
SELECT 
  '📊 Всего сообщений в таблице:' as info,
  COUNT(*) as total_messages
FROM messages;









