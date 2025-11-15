-- ============================================
-- ВОССТАНОВЛЕНИЕ ПОЛИТИКИ ДЛЯ EXERCISES
-- ============================================
-- Восстанавливаем политику "Anyone can read active exercises", 
-- которая была удалена в fix_performance_rls_policies.sql
-- Эта политика нужна для того, чтобы все пользователи (включая неаутентифицированных) 
-- могли видеть активные упражнения

-- Восстанавливаем политику "Anyone can read active exercises"
DROP POLICY IF EXISTS "Anyone can read active exercises" ON exercises;
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT
  USING (is_active = true);

-- Исправляем политику "Authenticated users can read all exercises" 
-- чтобы она использовала (select auth.uid()) для оптимизации
DROP POLICY IF EXISTS "Authenticated users can read all exercises" ON exercises;
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- Проверяем политики
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
ORDER BY policyname;

-- ✅ Политики восстановлены!

