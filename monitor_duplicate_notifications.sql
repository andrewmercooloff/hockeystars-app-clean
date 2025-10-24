-- ============================================
-- МОНИТОРИНГ ДУБЛИРУЮЩИХСЯ УВЕДОМЛЕНИЙ
-- ============================================

-- 1. Показываем последние уведомления с возможными дубликатами
SELECT 
  n1.id,
  n1.user_id,
  n1.type,
  n1.title,
  n1.created_at,
  COUNT(n2.id) as duplicate_count
FROM notifications n1
LEFT JOIN notifications n2 ON (
  n1.user_id = n2.user_id 
  AND n1.type = n2.type 
  AND n1.title = n2.title
  AND (
    (n1.data IS NULL AND n2.data IS NULL) OR
    (n1.data IS NOT NULL AND n2.data IS NOT NULL AND n1.data::text = n2.data::text)
  )
  AND n2.created_at >= n1.created_at - INTERVAL '1 hour'
  AND n2.id != n1.id
)
WHERE n1.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY n1.id, n1.user_id, n1.type, n1.title, n1.created_at
HAVING COUNT(n2.id) > 0
ORDER BY n1.created_at DESC, duplicate_count DESC
LIMIT 50;

-- 2. Статистика дублирования по часам
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  type,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) - COUNT(DISTINCT CONCAT(user_id, type, title, COALESCE(data::text, 'no_data'))) as potential_duplicates
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), type
ORDER BY hour DESC, potential_duplicates DESC;

-- 3. Топ пользователей с дублирующимися уведомлениями
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT CONCAT(type, title, COALESCE(data::text, 'no_data'))) as unique_notifications,
  COUNT(*) - COUNT(DISTINCT CONCAT(type, title, COALESCE(data::text, 'no_data'))) as duplicates
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) - COUNT(DISTINCT CONCAT(type, title, COALESCE(data::text, 'no_data'))) > 0
ORDER BY duplicates DESC
LIMIT 20;

-- 4. Проверка на дублирующиеся push токены
SELECT 
  user_id,
  COUNT(*) as token_count,
  COUNT(DISTINCT token) as unique_tokens
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > COUNT(DISTINCT token)
ORDER BY token_count DESC;
