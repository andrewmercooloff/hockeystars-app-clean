-- ============================================
-- 🎯 ПРЯМОЕ РЕШЕНИЕ - ОБНОВЛЯЕМ ВСЕ УВЕДОМЛЕНИЯ
-- ============================================

-- Просто обновляем ВСЕ уведомления пользователя на is_read = true
UPDATE public.notifications 
SET is_read = true 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
  AND is_read = false;

-- Проверяем результат
SELECT 
  'РЕЗУЛЬТАТ:' as info,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_notifications,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094';

-- Показываем последние уведомления
SELECT 
  id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
ORDER BY created_at DESC
LIMIT 5;


