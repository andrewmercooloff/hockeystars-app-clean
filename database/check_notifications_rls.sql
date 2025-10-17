-- ============================================
-- ПРОВЕРКА RLS ПОЛИТИК ДЛЯ NOTIFICATIONS
-- ============================================

-- 1. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- 2. Смотрим все политики для notifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd, -- SELECT, INSERT, UPDATE, DELETE, ALL
  qual, -- USING expression
  with_check -- WITH CHECK expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- 3. Проверяем права текущего пользователя
SELECT current_user, current_role;

-- 4. Тестируем UPDATE напрямую (вставьте реальный ID уведомления)
-- ВАЖНО: Замените '278318e5-5050-4e0d-8b21-f858acc77774' на актуальный ID
-- UPDATE public.notifications 
-- SET is_read = true 
-- WHERE id = '278318e5-5050-4e0d-8b21-f858acc77774';

-- Раскомментируйте и выполните, чтобы проверить UPDATE

-- ============================================
-- Если UPDATE не работает, возможно проблема в:
-- 1. RLS policy не разрешает UPDATE для authenticated роли
-- 2. Нет политики для UPDATE вообще
-- 3. Политика проверяет не то поле
-- ============================================

