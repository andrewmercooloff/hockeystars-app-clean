-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES БЕЗ AUTH.UID()
-- ============================================
-- Проблема: приложение использует кастомную авторизацию, а не Supabase Auth
-- Поэтому auth.uid() всегда NULL, и RLS блокирует доступ
-- 
-- РЕШЕНИЕ: Создаем политики, которые работают для всех authenticated пользователей
-- ВАЖНО: Это менее безопасно, но необходимо для работы с кастомной авторизацией

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

-- ШАГ 2: ВАРИАНТ 1 - Временно отключаем RLS для диагностики
-- Раскомментируйте следующую строку, если нужно полностью отключить RLS:
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ШАГ 3: ВАРИАНТ 2 - Включаем RLS с политиками для всех authenticated
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3.1. SELECT - разрешаем всем authenticated пользователям читать все сообщения
-- ВАЖНО: Это менее безопасно, но необходимо для работы с кастомной авторизацией
CREATE POLICY "Authenticated users can read all messages" ON messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 3.2. INSERT - разрешаем всем authenticated пользователям отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3.3. UPDATE - разрешаем всем authenticated пользователям обновлять сообщения
CREATE POLICY "Authenticated users can update messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3.4. DELETE - разрешаем всем authenticated пользователям удалять сообщения
CREATE POLICY "Authenticated users can delete messages" ON messages
  FOR DELETE
  TO authenticated
  USING (true);

-- ШАГ 4: Проверяем созданные политики
SELECT 
  '✅ Политики RLS созданы!' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- ШАГ 5: Проверяем количество сообщений
SELECT 
  '📊 Всего сообщений в таблице:' as info,
  COUNT(*) as total_messages,
  COUNT(DISTINCT sender_id) as unique_senders,
  COUNT(DISTINCT receiver_id) as unique_receivers
FROM messages;

-- ШАГ 6: Информация
SELECT 
  'ℹ️ ВАЖНО:' as info,
  'RLS политики настроены для работы с кастомной авторизацией' as note1,
  'Все authenticated пользователи могут видеть все сообщения' as note2,
  'Для большей безопасности рекомендуется использовать Supabase Auth' as note3;








