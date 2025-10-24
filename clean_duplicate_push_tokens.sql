-- ============================================
-- ОЧИСТКА ДУБЛИРУЮЩИХСЯ PUSH ТОКЕНОВ
-- ============================================

-- 1. Показываем дублирующиеся push токены
SELECT 
  user_id,
  COUNT(*) as token_count,
  COUNT(DISTINCT token) as unique_tokens,
  array_agg(token) as all_tokens,
  array_agg(platform) as platforms,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY token_count DESC;

-- 2. Удаляем дублирующиеся push токены (оставляем только самый новый)
WITH duplicate_tokens AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, token
      ORDER BY created_at DESC
    ) as rn
  FROM push_tokens
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
DELETE FROM push_tokens 
WHERE id IN (
  SELECT id FROM duplicate_tokens WHERE rn > 1
);

-- 3. Удаляем старые неактивные токены (старше 30 дней)
DELETE FROM push_tokens 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 4. Проверяем результат
SELECT 
  'После очистки:' as status,
  COUNT(*) as total_tokens,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT token) as unique_tokens
FROM push_tokens;

-- 5. Показываем оставшиеся токены по пользователям
SELECT 
  pt.user_id,
  p.name as user_name,
  COUNT(*) as device_count,
  array_agg(pt.platform) as platforms,
  MAX(pt.created_at) as last_updated
FROM push_tokens pt
JOIN players p ON pt.user_id = p.id
GROUP BY pt.user_id, p.name
ORDER BY device_count DESC;
