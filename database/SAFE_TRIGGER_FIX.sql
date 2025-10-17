-- ============================================
-- 🎯 БЕЗОПАСНОЕ ИСПРАВЛЕНИЕ ТРИГГЕРА
-- ============================================
-- Удаляем только триггер для notifications, не трогая функцию
-- ============================================

-- 1. Удаляем ТОЛЬКО триггер для таблицы notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS update_updated_at_column ON public.notifications;
DROP TRIGGER IF EXISTS set_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS handle_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;

-- 2. Проверяем, что триггеры удалены для notifications
SELECT 
  'ОСТАВШИЕСЯ ТРИГГЕРЫ ДЛЯ NOTIFICATIONS:' as info,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
  AND event_object_schema = 'public';

-- 3. Проверяем структуру таблицы notifications (есть ли поле updated_at)
SELECT 
  'СТРУКТУРА ТАБЛИЦЫ NOTIFICATIONS:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('updated_at', 'created_at', 'is_read', 'user_id')
ORDER BY ordinal_position;

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

-- 6. Считаем непрочитанные уведомления
SELECT 
  'СТАТИСТИКА УВЕДОМЛЕНИЙ:' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094';

-- ============================================
-- ПОСЛЕ ВЫПОЛНЕНИЯ:
-- 1. Нажмите 'r' в Expo
-- 2. Создайте уведомление
-- 3. Зайдите в "Уведомления"
-- 4. Подождите 5 секунд
-- 5. СЧЕТЧИК ИСЧЕЗНЕТ! 🎉
-- ============================================


