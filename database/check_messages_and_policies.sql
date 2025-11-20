-- ============================================
-- ПОЛНАЯ ПРОВЕРКА СООБЩЕНИЙ И ПОЛИТИК
-- ============================================

-- 1. Проверяем общее количество сообщений (без RLS)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

SELECT 
  'Общее количество сообщений в таблице:' as info,
  COUNT(*) as total_messages
FROM messages;

-- 2. Показываем примеры сообщений
SELECT 
  'Примеры сообщений (первые 10):' as info,
  id,
  sender_id,
  receiver_id,
  LEFT(text, 50) as text_preview,
  created_at,
  read
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- 3. Включаем RLS обратно
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Проверяем ПОЛНЫЕ условия политик (не обрезанные)
SELECT 
  'Полные условия политик RLS:' as info,
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- 5. Проверяем, что auth.uid() работает (в SQL Editor будет NULL, это нормально)
SELECT 
  'Проверка auth.uid():' as info,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NULL (нормально для SQL Editor)'
    ELSE 'UUID: ' || auth.uid()::text
  END as status;








