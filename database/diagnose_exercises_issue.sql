-- ============================================
-- ДИАГНОСТИКА ПРОБЛЕМЫ С EXERCISES
-- ============================================

-- 1. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'exercises';

-- 2. Проверяем все политики для exercises
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
ORDER BY policyname;

-- 3. Проверяем, есть ли данные в таблице
SELECT 
  COUNT(*) as total_exercises,
  COUNT(*) FILTER (WHERE is_active = true) as active_exercises,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_exercises
FROM exercises;

-- 4. Пробуем прочитать упражнения как анонимный пользователь (симуляция)
-- Это покажет, какие политики применяются
SET ROLE anon;
SELECT COUNT(*) as exercises_visible_to_anon FROM exercises;
RESET ROLE;

-- 5. Пробуем прочитать упражнения как аутентифицированный пользователь
-- (нужно будет заменить 'user-uuid' на реальный UUID пользователя)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = 'user-uuid';
-- SELECT COUNT(*) as exercises_visible_to_authenticated FROM exercises;
-- RESET ROLE;

-- 6. Проверяем, какие роли имеют доступ
SELECT 
  policyname,
  roles,
  cmd,
  CASE 
    WHEN 'anon' = ANY(roles) THEN '✅ Доступно анонимным'
    WHEN 'authenticated' = ANY(roles) THEN '✅ Доступно аутентифицированным'
    ELSE '❌ Недоступно'
  END as access_info
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
  AND cmd = 'SELECT';

