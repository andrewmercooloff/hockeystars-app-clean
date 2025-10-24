-- ============================================
-- ОЧИСТКА ДУБЛИРУЮЩИХСЯ ЗАПИСЕЙ ДРУЖБЫ
-- ============================================

-- 1. Показываем дублирующиеся записи дружбы
SELECT 
  from_id,
  to_id,
  status,
  COUNT(*) as duplicate_count,
  array_agg(id) as request_ids,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM friend_requests
WHERE status = 'accepted'
GROUP BY from_id, to_id, status
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Показываем пользователей, которые являются друзьями сами себе
SELECT 
  from_id,
  to_id,
  status,
  'Пользователь является другом самому себе!' as issue,
  created_at
FROM friend_requests
WHERE from_id = to_id AND status = 'accepted';

-- 3. Удаляем дублирующиеся записи дружбы (оставляем только самую новую)
WITH duplicate_friendships AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY from_id, to_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM friend_requests
  WHERE status = 'accepted'
)
DELETE FROM friend_requests 
WHERE id IN (
  SELECT id FROM duplicate_friendships WHERE rn > 1
);

-- 4. Удаляем записи, где пользователь является другом самому себе
DELETE FROM friend_requests 
WHERE from_id = to_id AND status = 'accepted';

-- 5. Проверяем результат
SELECT 
  'После очистки:' as status,
  COUNT(*) as total_friendships,
  COUNT(DISTINCT from_id) as unique_from_users,
  COUNT(DISTINCT to_id) as unique_to_users
FROM friend_requests
WHERE status = 'accepted';

-- 6. Показываем статистику дружбы
SELECT 
  'Статистика дружбы:' as info,
  COUNT(*) as total_accepted_requests,
  COUNT(DISTINCT from_id) as users_who_sent_requests,
  COUNT(DISTINCT to_id) as users_who_received_requests
FROM friend_requests
WHERE status = 'accepted';
