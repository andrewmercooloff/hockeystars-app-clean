-- ============================================
-- ДИАГНОСТИКА ПРОБЛЕМ С MESSAGES RLS
-- ============================================

-- 1. Проверяем текущие политики
SELECT 
  'Текущие политики RLS:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- 2. Проверяем, включен ли RLS
SELECT 
  'Статус RLS:' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'messages';

-- 3. Проверяем тип данных колонок
SELECT 
  'Типы данных колонок:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('sender_id', 'receiver_id', 'id')
ORDER BY ordinal_position;

-- 4. Проверяем, что auth.uid() работает
SELECT 
  'Проверка auth.uid():' as info,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NULL - пользователь не авторизован'
    ELSE 'UUID получен'
  END as status;

-- 5. Проверяем количество сообщений в таблице (без RLS)
-- ВАЖНО: Выполните этот запрос от имени суперпользователя или временно отключив RLS
SELECT 
  'Количество сообщений в таблице:' as info,
  COUNT(*) as total_messages
FROM messages;

-- 6. Проверяем, какие сообщения видит текущий пользователь
SELECT 
  'Сообщения, видимые текущим пользователем:' as info,
  COUNT(*) as visible_messages
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid();

-- 7. Проверяем примеры сообщений (если есть доступ)
SELECT 
  'Примеры сообщений (первые 5):' as info,
  id,
  sender_id,
  receiver_id,
  LEFT(text, 50) as text_preview,
  created_at,
  read
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;








