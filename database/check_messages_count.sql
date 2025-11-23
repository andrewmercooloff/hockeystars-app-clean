-- ============================================
-- ПРОВЕРКА КОЛИЧЕСТВА СООБЩЕНИЙ
-- ============================================

-- 1. Временно отключаем RLS для проверки общего количества
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

SELECT 
  'Общее количество сообщений в таблице (без RLS):' as info,
  COUNT(*) as total_messages
FROM messages;

-- 2. Показываем примеры сообщений (если есть)
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

-- 4. Проверяем политики
SELECT 
  'Текущие политики RLS:' as info,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;









