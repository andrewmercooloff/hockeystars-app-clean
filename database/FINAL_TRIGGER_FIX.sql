-- ============================================
-- 🎯 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ТРИГГЕРА
-- ============================================
-- Удаляем проблемный триггер updated_at
-- ============================================

-- 1. Находим и удаляем ВСЕ триггеры связанные с updated_at
DROP TRIGGER IF EXISTS update_updated_at_column ON public.notifications;
DROP TRIGGER IF EXISTS set_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS handle_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;

-- 2. Удаляем функцию триггера (если она есть)
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS handle_updated_at();

-- 3. Проверяем, что триггеры удалены
SELECT 
  'ОСТАВШИЕСЯ ТРИГГЕРЫ:' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
  AND event_object_schema = 'public';

-- 4. Теперь пробуем обновить уведомления
UPDATE public.notifications 
SET is_read = true 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
  AND is_read = false;

-- 5. Проверяем результат
SELECT 
  'РЕЗУЛЬТАТ ПОСЛЕ УДАЛЕНИЯ ТРИГГЕРА:' as info,
  id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- ПОСЛЕ ВЫПОЛНЕНИЯ:
-- 1. Нажмите 'r' в Expo
-- 2. Создайте уведомление
-- 3. Зайдите в "Уведомления"
-- 4. Подождите 5 секунд
-- 5. СЧЕТЧИК ИСЧЕЗНЕТ! 🎉
-- ============================================


