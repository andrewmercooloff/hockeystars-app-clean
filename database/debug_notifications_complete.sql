-- ============================================
-- ПОЛНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ С УВЕДОМЛЕНИЯМИ
-- ============================================

-- 1. Проверяем структуру таблицы notifications
SELECT 'СТРУКТУРА ТАБЛИЦЫ:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Проверяем все политики RLS
SELECT 'ПОЛИТИКИ RLS:' as info;
SELECT 
  policyname,
  cmd,
  permissive,
  roles::text[],
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- 3. Проверяем включен ли RLS
SELECT 'RLS СТАТУС:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- 4. Смотрим конкретное уведомление
SELECT 'КОНКРЕТНОЕ УВЕДОМЛЕНИЕ:' as info;
SELECT 
  id,
  user_id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE id = '278318e5-5050-4e0d-8b21-f858acc77774';

-- 5. Проверяем все непрочитанные уведомления для пользователя
SELECT 'ВСЕ НЕПРОЧИТАННЫЕ:' as info;
SELECT 
  id,
  user_id,
  type,
  is_read,
  title,
  created_at
FROM public.notifications 
WHERE user_id = '1bc22582-30bf-4375-9c0b-ac6132542094'
  AND is_read = false
ORDER BY created_at DESC;

-- 6. Пробуем обновить вручную
SELECT 'ПРОБУЕМ ОБНОВИТЬ:' as info;
UPDATE public.notifications 
SET is_read = true 
WHERE id = '278318e5-5050-4e0d-8b21-f858acc77774';

-- 7. Проверяем результат обновления
SELECT 'РЕЗУЛЬТАТ ОБНОВЛЕНИЯ:' as info;
SELECT 
  id,
  user_id,
  type,
  is_read,
  created_at
FROM public.notifications 
WHERE id = '278318e5-5050-4e0d-8b21-f858acc77774';


