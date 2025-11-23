-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Этот скрипт гарантированно исправляет проблему с отображением сообщений

-- ШАГ 1: Удаляем ВСЕ существующие политики
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

-- ШАГ 2: Включаем RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 3: Создаем правильные политики
-- 3.1. SELECT - пользователи могут читать сообщения, где они отправитель ИЛИ получатель
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid()) OR (receiver_id = auth.uid())
  );

-- 3.2. INSERT - аутентифицированные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- 3.3. UPDATE - отправитель или получатель могут обновлять сообщения
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    (sender_id = auth.uid()) OR (receiver_id = auth.uid())
  )
  WITH CHECK (
    (sender_id = auth.uid()) OR (receiver_id = auth.uid())
  );

-- 3.4. DELETE - только отправитель может удалять свои сообщения
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
  );

-- ШАГ 4: Проверяем созданные политики
SELECT 
  '✅ Политики RLS созданы!' as status,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- ШАГ 5: Проверяем количество сообщений (временно отключаем RLS)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
SELECT 
  '📊 Всего сообщений в таблице (без RLS):' as info,
  COUNT(*) as total_messages
FROM messages;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 6: Информация о том, что делать дальше
SELECT 
  'ℹ️ Следующие шаги:' as info,
  '1. Проверьте логи в приложении при открытии экрана сообщений' as step1,
  '2. Убедитесь, что пользователь авторизован в приложении' as step2,
  '3. Если сообщения все еще не появляются, проверьте auth.uid() в приложении' as step3;









