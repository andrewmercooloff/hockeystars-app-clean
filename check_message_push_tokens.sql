-- ============================================
-- ПРОВЕРКА PUSH ТОКЕНОВ ДЛЯ СООБЩЕНИЙ
-- ============================================

-- 1. Проверяем push токены для пользователей из логов
SELECT 
  pt.user_id,
  p.name as user_name,
  pt.token,
  pt.platform,
  pt.created_at,
  pt.updated_at
FROM push_tokens pt
JOIN players p ON pt.user_id = p.id
WHERE pt.user_id IN (
  '1bc22582-30bf-4375-9c0b-ac6132542094', -- ADMIN (отправитель)
  '3cd6dfc5-699b-4770-90cb-572edd39a9f3'  -- Получатель
)
ORDER BY pt.user_id, pt.created_at DESC;

-- 2. Проверяем последние сообщения
SELECT 
  m.id,
  m.sender_id,
  s.name as sender_name,
  m.receiver_id,
  r.name as receiver_name,
  m.text,
  m.created_at
FROM messages m
JOIN players s ON m.sender_id = s.id
JOIN players r ON m.receiver_id = r.id
WHERE m.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY m.created_at DESC
LIMIT 10;

-- 3. Проверяем, есть ли push токены у получателя
SELECT 
  'Push токены получателя:' as info,
  COUNT(*) as token_count
FROM push_tokens
WHERE user_id = '3cd6dfc5-699b-4770-90cb-572edd39a9f3';

-- 4. Проверяем все активные push токены
SELECT 
  'Все активные push токены:' as info,
  COUNT(*) as total_tokens,
  COUNT(DISTINCT user_id) as unique_users
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '7 days';
