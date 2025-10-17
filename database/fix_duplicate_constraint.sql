-- Исправление проблемы с duplicate key constraint

-- 1. Удаляем проблемный уникальный индекс
DROP INDEX IF EXISTS idx_activity_points_unique_user;

-- 2. Проверяем, что у нас уже есть UNIQUE constraint на user_id из CREATE TABLE
-- Если есть, оставляем его - он правильный
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.activity_points'::regclass
  AND contype = 'u';

-- 3. Очищаем таблицы полностью для чистого старта
TRUNCATE TABLE public.activity_log;
TRUNCATE TABLE public.activity_points;

-- 4. Проверяем что таблицы пустые
SELECT 'activity_points' as table_name, COUNT(*) as count FROM public.activity_points
UNION ALL
SELECT 'activity_log' as table_name, COUNT(*) as count FROM public.activity_log;


