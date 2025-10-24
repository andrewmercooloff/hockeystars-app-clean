-- ============================================
-- ОЧИСТКА ДУБЛИРУЮЩИХСЯ УВЕДОМЛЕНИЙ
-- ============================================

-- 1. Удаляем дублирующиеся уведомления (оставляем только самое новое)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type, title, 
      CASE 
        WHEN data IS NOT NULL THEN data::text 
        ELSE 'no_data' 
      END
      ORDER BY timestamp DESC
    ) as rn
  FROM notifications
)
DELETE FROM notifications 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Проверяем результат
SELECT 
  'Дублирующиеся уведомления удалены!' as status,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users
FROM notifications;
