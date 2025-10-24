-- ============================================
-- ОТЛАДКА ПРОБЛЕМЫ С УВЕДОМЛЕНИЯМИ
-- ============================================

-- 1. Проверяем дублирующиеся push токены для одного пользователя
SELECT 
  user_id,
  COUNT(*) as token_count,
  COUNT(DISTINCT token) as unique_tokens,
  array_agg(token) as all_tokens
FROM push_tokens
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY token_count DESC;

-- 2. Проверяем дублирующиеся записи дружбы
SELECT 
  from_id,
  to_id,
  status,
  COUNT(*) as duplicate_count,
  array_agg(id) as request_ids
FROM friend_requests
WHERE status = 'accepted'
GROUP BY from_id, to_id, status
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. Проверяем, есть ли пользователи, которые являются друзьями сами себе
SELECT 
  from_id,
  to_id,
  status,
  'Пользователь является другом самому себе!' as issue
FROM friend_requests
WHERE from_id = to_id AND status = 'accepted';

-- 4. Проверяем последние уведомления с дублированием
SELECT 
  user_id,
  type,
  title,
  COUNT(*) as notification_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created,
  array_agg(id) as notification_ids
FROM notifications
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, type, title
HAVING COUNT(*) > 1
ORDER BY notification_count DESC, last_created DESC;

-- 5. Проверяем, сколько раз вызывалась функция notifyFriendsAboutChanges
-- (это можно отследить по логам, но в БД мы видим результат)
SELECT 
  data->>'changedPlayerId' as player_id,
  data->>'changedPlayerName' as player_name,
  COUNT(*) as notification_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM notifications
WHERE type IN ('stats_change', 'physical_data_changed')
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY data->>'changedPlayerId', data->>'changedPlayerName'
ORDER BY notification_count DESC;

-- 6. Проверяем активные устройства пользователей
SELECT 
  pt.user_id,
  p.name as user_name,
  COUNT(*) as device_count,
  array_agg(pt.token) as tokens,
  array_agg(pt.platform) as platforms
FROM push_tokens pt
JOIN players p ON pt.user_id = p.id
WHERE pt.created_at >= NOW() - INTERVAL '7 days'
GROUP BY pt.user_id, p.name
HAVING COUNT(*) > 1
ORDER BY device_count DESC;
