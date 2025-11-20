-- ============================================
-- ПРОСТАЯ ПРОВЕРКА СООБЩЕНИЙ
-- ============================================

-- 1. Временно отключаем RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 2. Проверяем количество сообщений
SELECT 
  COUNT(*) as total_messages
FROM messages;

-- 3. Показываем примеры (если есть)
SELECT 
  id,
  sender_id,
  receiver_id,
  LEFT(text, 50) as text_preview,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 5;

-- 4. Включаем RLS обратно
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;







