-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ПОЛИТИК RLS ДЛЯ EXERCISES
-- ============================================
-- Этот скрипт гарантированно исправляет проблему с отображением упражнений

-- Удаляем ВСЕ существующие политики
DROP POLICY IF EXISTS "Anyone can read active exercises" ON exercises;
DROP POLICY IF EXISTS "Authenticated users can read all exercises" ON exercises;
DROP POLICY IF EXISTS "Only admins can modify exercises" ON exercises;
DROP POLICY IF EXISTS "Only admins can insert exercises" ON exercises;
DROP POLICY IF EXISTS "Only admins can update exercises" ON exercises;
DROP POLICY IF EXISTS "Only admins can delete exercises" ON exercises;

-- 1. Политика для чтения активных упражнений (для ВСЕХ, включая неаутентифицированных)
-- Используем PUBLIC роль, чтобы политика применялась ко всем
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT
  TO public
  USING (is_active = true);

-- 2. Политика для чтения всех упражнений (для аутентифицированных пользователей)
-- Эта политика позволяет аутентифицированным пользователям видеть все упражнения (включая неактивные)
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Политики для модификации упражнений (только для админов)
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
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
ORDER BY cmd, policyname;

-- Проверяем данные
SELECT 
  COUNT(*) as total_exercises,
  COUNT(*) FILTER (WHERE is_active = true) as active_exercises,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_exercises
FROM exercises;

-- Тестируем доступ (должно вернуть активные упражнения)
SELECT 
  exercise_id,
  title_ru,
  is_active
FROM exercises
WHERE is_active = true
ORDER BY exercise_id
LIMIT 10;

-- ✅ Политики исправлены!
-- Теперь:
-- - Все (включая неаутентифицированных) могут читать активные упражнения
-- - Аутентифицированные пользователи могут читать все упражнения
-- - Только админы могут изменять упражнения

