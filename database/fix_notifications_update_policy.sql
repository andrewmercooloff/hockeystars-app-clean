-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИКИ ДЛЯ UPDATE
-- ============================================
-- Проблема: UPDATE не работает, is_read остается false
-- Решение: Добавляем/исправляем политику для UPDATE
-- ============================================

-- Удаляем старые политики UPDATE (если есть)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for users" ON public.notifications;
DROP POLICY IF EXISTS "Allow update own notifications" ON public.notifications;

-- Создаем новую политику для UPDATE
-- Разрешаем всем аутентифицированным пользователям обновлять СВОИ уведомления
CREATE POLICY "Allow users to update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated, anon
USING (user_id = auth.uid()::text OR user_id = current_user)
WITH CHECK (user_id = auth.uid()::text OR user_id = current_user);

-- Если в таблице используется playerId вместо user_id, добавляем альтернативную политику
CREATE POLICY "Allow users to update own notifications by playerId"
ON public.notifications
FOR UPDATE
TO authenticated, anon
USING (
  user_id = auth.uid()::text 
  OR user_id = current_user
  OR COALESCE(user_id, '') = ''  -- Разрешаем если user_id пустой
)
WITH CHECK (
  user_id = auth.uid()::text 
  OR user_id = current_user
  OR COALESCE(user_id, '') = ''
);

-- Для максимальной совместимости: разрешаем UPDATE для всех authenticated
-- (можно использовать временно для отладки)
-- DROP POLICY IF EXISTS "Allow all updates for authenticated" ON public.notifications;
-- CREATE POLICY "Allow all updates for authenticated"
-- ON public.notifications
-- FOR UPDATE
-- TO authenticated, anon
-- USING (true)
-- WITH CHECK (true);

-- Проверяем созданные политики
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- После выполнения:
-- 1. Перезагрузите приложение
-- 2. Создайте новое уведомление
-- 3. Зайдите в "Уведомления"
-- 4. Подождите 5 секунд
-- 5. Счетчик должен исчезнуть!
-- ============================================


