-- ============================================
-- ТЕСТИРОВАНИЕ ДОСТУПА К EXERCISES
-- ============================================
-- Этот скрипт проверяет, что политики работают правильно

-- 1. Проверяем текущие политики
SELECT
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
ORDER BY cmd, policyname;

-- 2. Проверяем данные
SELECT 
  COUNT(*) as total_exercises,
  COUNT(*) FILTER (WHERE is_active = true) as active_exercises,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_exercises
FROM exercises;

-- 3. Пробуем прочитать активные упражнения (как анонимный пользователь)
-- Это должно работать благодаря политике "Anyone can read active exercises"
SELECT 
  exercise_id,
  title_ru,
  is_active
FROM exercises
WHERE is_active = true
ORDER BY exercise_id
LIMIT 5;

-- 4. Проверяем, что RLS включен
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'exercises';

-- 5. Проверяем структуру таблицы (может быть проблема с колонками)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exercises'
ORDER BY ordinal_position;

