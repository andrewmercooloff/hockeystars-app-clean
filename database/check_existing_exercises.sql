-- Проверка существующих упражнений
-- Выполните этот скрипт в Supabase SQL Editor

-- Показать все существующие упражнения
SELECT exercise_id, title_ru, category, difficulty 
FROM exercises 
ORDER BY exercise_id::int;

-- Подсчитать количество
SELECT COUNT(*) as total_exercises FROM exercises;

-- Показать диапазон ID
SELECT 
  MIN(exercise_id::int) as min_id,
  MAX(exercise_id::int) as max_id,
  COUNT(*) as total_count
FROM exercises;






























