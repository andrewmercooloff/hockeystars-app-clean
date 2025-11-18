-- ============================================
-- ВОССТАНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Исправляет проблему с отображением сообщений в чате
-- Более мягкие политики для восстановления доступа

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

-- ВАРИАНТ 1: Временно отключаем RLS для диагностики (раскомментируйте, если нужно)
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ВАРИАНТ 2: Включаем RLS с правильными политиками
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. Политика для SELECT: пользователи могут читать сообщения, где они отправитель или получатель
-- Используем прямое сравнение UUID (без приведения к text)
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    -- Проверяем, что пользователь авторизован
    auth.uid() IS NOT NULL AND
    -- Пользователь может видеть сообщения, где он отправитель или получатель
    (sender_id = auth.uid() OR receiver_id = auth.uid())
  );

-- 2. Политика для INSERT: аутентифицированные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Проверяем, что пользователь авторизован
    auth.uid() IS NOT NULL AND
    -- Отправитель должен быть текущим пользователем
    sender_id = auth.uid()
  );

-- 3. Политика для UPDATE: пользователи могут обновлять свои сообщения (отправитель) или помечать как прочитанные (получатель)
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    -- Проверяем, что пользователь авторизован
    auth.uid() IS NOT NULL AND
    -- Пользователь может обновлять сообщения, где он отправитель или получатель
    (sender_id = auth.uid() OR receiver_id = auth.uid())
  )
  WITH CHECK (
    -- Проверяем, что пользователь авторизован
    auth.uid() IS NOT NULL AND
    -- После обновления пользователь все еще должен быть отправителем или получателем
    (sender_id = auth.uid() OR receiver_id = auth.uid())
  );

-- 4. Политика для DELETE: пользователи могут удалять свои сообщения (только отправитель)
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    -- Проверяем, что пользователь авторизован
    auth.uid() IS NOT NULL AND
    -- Удалять может только отправитель
    sender_id = auth.uid()
  );

-- Проверяем результат
SELECT 
  'Политики RLS для messages восстановлены!' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- Тест: проверяем, что политики работают
-- Замените 'YOUR_USER_ID' на реальный UUID пользователя для теста
-- SELECT COUNT(*) as visible_messages
-- FROM messages
-- WHERE sender_id = 'YOUR_USER_ID'::uuid OR receiver_id = 'YOUR_USER_ID'::uuid;






