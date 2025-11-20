-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ MESSAGES С ПОДДЕРЖКОЙ АДМИНОВ
-- ============================================
-- Этот скрипт исправляет проблему и добавляет доступ для админов

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
DROP POLICY IF EXISTS "Admins can read all messages" ON messages;

-- ШАГ 2: Включаем RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 3: Создаем политики
-- 3.1. SELECT - пользователи могут читать сообщения, где они отправитель ИЛИ получатель
-- ИЛИ если они админ
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid()) OR 
    (receiver_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE id = auth.uid() 
      AND status = 'admin'
    )
  );

-- 3.2. INSERT - аутентифицированные пользователи могут отправлять сообщения
CREATE POLICY "Authenticated users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- 3.3. UPDATE - отправитель или получатель могут обновлять сообщения
-- ИЛИ админ
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    (sender_id = auth.uid()) OR 
    (receiver_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE id = auth.uid() 
      AND status = 'admin'
    )
  )
  WITH CHECK (
    (sender_id = auth.uid()) OR 
    (receiver_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE id = auth.uid() 
      AND status = 'admin'
    )
  );

-- 3.4. DELETE - только отправитель может удалять свои сообщения
-- ИЛИ админ
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE id = auth.uid() 
      AND status = 'admin'
    )
  );

-- ШАГ 4: Проверяем созданные политики
SELECT 
  '✅ Политики RLS созданы!' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- ШАГ 5: Проверяем количество сообщений (временно отключаем RLS)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
SELECT 
  '📊 Всего сообщений в таблице (без RLS):' as info,
  COUNT(*) as total_messages,
  COUNT(DISTINCT sender_id) as unique_senders,
  COUNT(DISTINCT receiver_id) as unique_receivers
FROM messages;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 6: Показываем примеры сообщений (без RLS для диагностики)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
SELECT 
  '📨 Примеры сообщений (первые 5):' as info,
  id,
  sender_id,
  receiver_id,
  LEFT(text, 50) as text_preview,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ШАГ 7: Информация
SELECT 
  'ℹ️ Политики созданы с поддержкой админов!' as info,
  'Админы могут видеть все сообщения' as note1,
  'Обычные пользователи видят только свои сообщения' as note2;







