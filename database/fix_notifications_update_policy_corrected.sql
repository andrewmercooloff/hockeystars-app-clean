-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ UPDATE (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- ============================================
-- Проблема: user_id имеет тип TEXT, а auth.uid() возвращает UUID
-- Решение: Приводим типы правильно
-- ============================================

-- Удаляем все старые политики UPDATE
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for users" ON public.notifications;
DROP POLICY IF EXISTS "Allow update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow users to update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow users to update own notifications by playerId" ON public.notifications;
DROP POLICY IF EXISTS "Allow all updates for authenticated" ON public.notifications;

-- Создаем новую политику для UPDATE
-- user_id в notifications это TEXT, поэтому приводим auth.uid() к TEXT
CREATE POLICY "Enable update for authenticated users"
ON public.notifications
FOR UPDATE
TO authenticated, anon
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Проверяем созданные политики
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- После выполнения:
-- 1. Перезагрузите приложение (нажмите r в Expo)
-- 2. Создайте новое уведомление
-- 3. Зайдите в "Уведомления"
-- 4. Подождите 5 секунд
-- 5. Счетчик должен исчезнуть!
-- ============================================


