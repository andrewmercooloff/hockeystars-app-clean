-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ NOTIFICATIONS
-- ============================================
-- Этот скрипт работает независимо от типа user_id
-- ============================================

-- 1. Удаляем ВСЕ старые политики UPDATE
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications'
      AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;

-- 2. Создаем максимально простую политику для UPDATE
-- Используем CAST для совместимости с любым типом
CREATE POLICY "Allow update notifications"
ON public.notifications
FOR UPDATE
TO authenticated, anon
USING (
  -- Пробуем оба варианта приведения типов
  user_id::text = auth.uid()::text
)
WITH CHECK (
  user_id::text = auth.uid()::text
);

-- 3. Проверяем, что политика создана
SELECT 
  policyname,
  cmd,
  roles::text[],
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
  AND cmd = 'UPDATE';

-- 4. Проверяем структуру таблицы
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('user_id', 'id', 'is_read');

-- ============================================
-- ТЕСТИРОВАНИЕ:
-- После выполнения скрипта:
-- 1. Нажмите 'r' в Expo для перезагрузки
-- 2. Создайте новое уведомление (измените стату)
-- 3. Зайдите в "Уведомления"
-- 4. Подождите 5 секунд
-- 5. Счетчик должен исчезнуть!
-- ============================================



