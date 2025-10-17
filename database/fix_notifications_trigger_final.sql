-- ============================================
-- ИСПРАВЛЕНИЕ ТРИГГЕРА UPDATED_AT
-- ============================================
-- Проблема: Триггер пытается обновить несуществующее поле updated_at
-- Решение: Удаляем триггер
-- ============================================

-- Удаляем все возможные варианты триггера updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS set_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS update_updated_at_column ON public.notifications;
DROP TRIGGER IF EXISTS update_updated_at ON public.notifications;

-- Проверяем что триггеры удалены
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
  AND trigger_schema = 'public';

-- Должен вернуть пустой результат (или только другие триггеры)

-- ============================================
-- После выполнения этого скрипта:
-- 1. Уведомления будут корректно отмечаться как прочитанные
-- 2. Счетчик будет исчезать через 5 секунд
-- 3. Ошибка 42703 больше не будет появляться
-- ============================================


