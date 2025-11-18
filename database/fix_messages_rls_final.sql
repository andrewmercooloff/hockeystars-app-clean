-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Исправляет проблему с отображением сообщений (0 сообщений видно)

-- ШАГ 1: Проверяем, что auth.uid() работает
SELECT 
  'Проверка auth.uid():' as step,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - пользователь не авторизован в SQL Editor'
    ELSE '✅ UUID получен: ' || auth.uid()::text
  END as status;

-- ШАГ 2: Удаляем ВСЕ существующие политики
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

-- ШАГ 3: Включаем RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 4: Создаем политики
-- Используем простое сравнение UUID (без приведения к text)

-- 4.1. Политика для SELECT - простое сравнение UUID
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 4.2. Политика для INSERT
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- 4.3. Политика для UPDATE - получатель может помечать как прочитанное
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 4.4. Политика для DELETE
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
  );

-- ШАГ 5: Проверяем результат
SELECT 
  'Политики RLS созданы!' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- ШАГ 6: Проверяем, есть ли сообщения в таблице (временно отключаем RLS для проверки)
-- ВАЖНО: Это только для диагностики!
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

SELECT 
  'Проверка без RLS:' as test,
  COUNT(*) as total_messages_in_table
FROM messages;

-- Включаем RLS обратно
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 7: Тестируем доступ с RLS (в SQL Editor может показать 0, если auth.uid() = NULL)
-- В приложении должно работать, если пользователь авторизован
SELECT 
  'Тест доступа к сообщениям (с RLS):' as test,
  COUNT(*) as visible_messages_count,
  CASE 
    WHEN auth.uid() IS NULL THEN '⚠️ auth.uid() = NULL в SQL Editor (нормально)'
    ELSE '✅ auth.uid() работает'
  END as auth_status
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid();

