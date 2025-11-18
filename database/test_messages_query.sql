-- ============================================
-- ТЕСТИРОВАНИЕ ЗАПРОСА СООБЩЕНИЙ
-- ============================================
-- Проверяем, как работает запрос с .or() и RLS

-- 1. Проверяем auth.uid()
SELECT 
  'Проверка auth.uid():' as test,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL'
    ELSE '✅ ' || auth.uid()::text
  END as status;

-- 2. Проверяем количество сообщений без RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
SELECT 
  'Все сообщения (без RLS):' as test,
  COUNT(*) as total_count,
  COUNT(DISTINCT sender_id) as unique_senders,
  COUNT(DISTINCT receiver_id) as unique_receivers
FROM messages;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Проверяем запрос с .or() (эмулируем getUserConversations)
-- Замените 'USER_ID_HERE' на реальный UUID пользователя из таблицы messages
SELECT 
  'Тест запроса с .or() (замените USER_ID_HERE):' as test,
  COUNT(*) as message_count
FROM messages
WHERE sender_id = 'USER_ID_HERE' OR receiver_id = 'USER_ID_HERE';

-- 4. Проверяем, какие сообщения видны с RLS (если auth.uid() работает)
SELECT 
  'Сообщения с RLS (если auth.uid() работает):' as test,
  COUNT(*) as visible_count,
  CASE 
    WHEN auth.uid() IS NULL THEN '⚠️ auth.uid() = NULL (нормально в SQL Editor)'
    ELSE '✅ auth.uid() = ' || auth.uid()::text
  END as auth_status
FROM messages
WHERE sender_id = auth.uid() OR receiver_id = auth.uid();

-- 5. Показываем примеры сообщений (если есть)
SELECT 
  'Примеры сообщений (первые 5):' as test,
  id,
  sender_id,
  receiver_id,
  LEFT(text, 30) as text_preview,
  created_at
FROM messages
LIMIT 5;





