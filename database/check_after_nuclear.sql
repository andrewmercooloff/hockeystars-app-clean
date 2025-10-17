-- Проверяем что произошло после ядерного скрипта
SELECT 'ПРОВЕРКА ПОСЛЕ ЯДЕРНОГО СКРИПТА:' as info;

-- 1. Проверяем RLS статус
SELECT 'RLS СТАТУС:' as step;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- 2. Проверяем политики
SELECT 'ТЕКУЩИЕ ПОЛИТИКИ:' as step;
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- 3. Проверяем конкретное уведомление
SELECT 'КОНКРЕТНОЕ УВЕДОМЛЕНИЕ:' as step;
SELECT 
  id,
  user_id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
ORDER BY created_at DESC
LIMIT 3;

-- 4. Пробуем обновить БЕЗ WHERE (все уведомления пользователя)
SELECT 'ОБНОВЛЯЕМ ВСЕ УВЕДОМЛЕНИЯ ПОЛЬЗОВАТЕЛЯ:' as step;
UPDATE public.notifications 
SET is_read = true 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094';

-- 5. Проверяем результат
SELECT 'РЕЗУЛЬТАТ МАССОВОГО ОБНОВЛЕНИЯ:' as step;
SELECT 
  id,
  user_id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
ORDER BY created_at DESC
LIMIT 3;


