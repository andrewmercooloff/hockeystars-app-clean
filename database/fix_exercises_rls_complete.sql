-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ ПОЛИТИК RLS ДЛЯ EXERCISES
-- ============================================
-- Исправляет проблему с отображением упражнений

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Anyone can read active exercises" ON exercises;
DROP POLICY IF EXISTS "Authenticated users can read all exercises" ON exercises;
DROP POLICY IF EXISTS "Only admins can modify exercises" ON exercises;

-- 1. Политика для чтения активных упражнений (для всех, включая неаутентифицированных)
-- ВАЖНО: Используем permissive политику для anon роли
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 2. Политика для чтения всех упражнений (для аутентифицированных пользователей)
-- Эта политика позволяет аутентифицированным пользователям видеть все упражнения (включая неактивные)
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Политика для модификации упражнений (только для админов)
-- ВАЖНО: Используем отдельные политики для INSERT, UPDATE, DELETE, а не FOR ALL
-- Это предотвращает блокировку SELECT

CREATE POLICY "Only admins can insert exercises" ON exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

CREATE POLICY "Only admins can update exercises" ON exercises
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

CREATE POLICY "Only admins can delete exercises" ON exercises
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- Проверяем политики
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
ORDER BY cmd, policyname;

-- Проверяем, что данные доступны
SELECT 
  COUNT(*) as total_exercises,
  COUNT(*) FILTER (WHERE is_active = true) as active_exercises
FROM exercises;

-- ✅ Политики исправлены!
-- Теперь:
-- - Все могут читать активные упражнения (is_active = true)
-- - Аутентифицированные пользователи могут читать все упражнения
-- - Только админы могут изменять упражнения


