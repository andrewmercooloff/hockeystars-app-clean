-- ============================================
-- ПРОВЕРКА НАСТРОЕК SUPABASE REALTIME
-- ============================================

-- 1. Проверяем, включен ли Realtime для таблицы messages
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  relreplident
FROM pg_tables 
WHERE tablename = 'messages';

-- 2. Проверяем публикации Realtime
SELECT 
  pubname,
  puballtables,
  pubinsert,
  pubupdate,
  pubdelete,
  pubtruncate
FROM pg_publication 
WHERE pubname LIKE '%realtime%' OR pubname LIKE '%supabase%';

-- 3. Проверяем, подписана ли таблица messages на публикацию
SELECT 
  p.pubname,
  c.relname as table_name
FROM pg_publication p
JOIN pg_publication_tables pt ON p.oid = pt.ptpubid
JOIN pg_class c ON pt.ptrelid = c.oid
WHERE c.relname = 'messages';

-- 4. Проверяем RLS политики для таблицы messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- 5. Проверяем последние сообщения
SELECT 
  id,
  sender_id,
  receiver_id,
  text,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Проверяем push токены
SELECT 
  user_id,
  token,
  platform,
  created_at
FROM push_tokens 
ORDER BY created_at DESC 
LIMIT 10;
