-- ============================================
-- ПРОВЕРКА PUSH ТОКЕНОВ
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
  '1bc22582-30bf-4375-9c0b-ac6132542094', -- ADMIN
  'd6029aa2-5047-4d2e-927d-741de6292af5', -- Друг 1
  '3cd6dfc5-699b-4770-90cb-572edd39a9f3'  -- Друг 2
)
ORDER BY pt.user_id, pt.created_at DESC;

-- 2. Проверяем, есть ли активные push токены
SELECT 
  'Активные push токены:' as info,
  COUNT(*) as total_tokens,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT platform) as platforms
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 3. Проверяем платформы
SELECT 
  platform,
  COUNT(*) as token_count,
  COUNT(DISTINCT user_id) as unique_users
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY platform
ORDER BY token_count DESC;

-- 4. Проверяем последние регистрации токенов
SELECT 
  pt.user_id,
  p.name as user_name,
  pt.platform,
  pt.created_at,
  'Последние регистрации токенов' as info
FROM push_tokens pt
JOIN players p ON pt.user_id = p.id
WHERE pt.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY pt.created_at DESC
LIMIT 10;
