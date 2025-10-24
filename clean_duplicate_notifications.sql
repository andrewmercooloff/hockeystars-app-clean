-- ============================================
-- ОЧИСТКА ДУБЛИРУЮЩИХСЯ УВЕДОМЛЕНИЙ
-- ============================================

-- 1. Показываем количество дублирующихся уведомлений до очистки
SELECT 
  'До очистки:' as status,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users
FROM notifications;

-- 2. Показываем дублирующиеся уведомления
WITH duplicates AS (
  SELECT 
    user_id,
    type,
    title,
    CASE 
      WHEN data IS NOT NULL THEN data::text 
      ELSE 'no_data' 
    END as data_text,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
  FROM notifications
  GROUP BY user_id, type, title, 
    CASE 
      WHEN data IS NOT NULL THEN data::text 
      ELSE 'no_data' 
    END
  HAVING COUNT(*) > 1
)
SELECT 
  'Дублирующиеся уведомления:' as info,
  duplicate_count,
  user_id,
  type,
  title,
  first_created,
  last_created
FROM duplicates
ORDER BY duplicate_count DESC, last_created DESC;

-- 3. Удаляем дублирующиеся уведомления (оставляем только самое новое)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, title, 
      CASE 
        WHEN data IS NOT NULL THEN data::text 
        ELSE 'no_data' 
      END
      ORDER BY created_at DESC
    ) as rn
  FROM notifications
)
DELETE FROM notifications 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 4. Проверяем результат после очистки
SELECT 
  'После очистки:' as status,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users
FROM notifications;

-- 5. Показываем статистику по типам уведомлений
SELECT 
  type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM notifications
GROUP BY type
ORDER BY count DESC;
