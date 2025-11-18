-- ============================================
-- ПРОВЕРКА ТЕКУЩИХ RLS ПОЛИТИК ДЛЯ MESSAGES
-- ============================================
-- Этот скрипт показывает текущие политики и их условия

-- 1. Проверяем, включен ли RLS
SELECT 
  'RLS Status:' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'messages';

-- 2. Показываем все текущие политики для messages
SELECT 
  'Current Policies:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- 3. Проверяем auth.uid() в контексте SQL Editor
SELECT 
  'Auth Context:' as info,
  auth.uid() as current_auth_uid,
  auth.role() as current_auth_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ auth.uid() = NULL (нормально в SQL Editor)'
    ELSE '✅ auth.uid() = ' || auth.uid()::text
  END as auth_status;

-- 4. Проверяем количество сообщений (временно отключаем RLS для проверки)
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
SELECT 
  'Messages count (RLS disabled):' as info,
  COUNT(*) as total_messages,
  COUNT(DISTINCT sender_id) as unique_senders,
  COUNT(DISTINCT receiver_id) as unique_receivers
FROM messages;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Пробуем запрос с RLS включенным (в SQL Editor может показать 0, если auth.uid() = NULL)
SELECT 
  'Messages with RLS (if auth.uid() works):' as info,
  COUNT(*) as visible_messages
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid();






