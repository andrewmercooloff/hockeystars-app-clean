-- Проверка данных в таблицах активности

-- Проверяем все записи в activity_points
SELECT 
    'activity_points' as table_name,
    user_id,
    points,
    last_activity_date,
    created_at
FROM public.activity_points
ORDER BY created_at DESC;

-- Проверяем все записи в activity_log
SELECT 
    'activity_log' as table_name,
    user_id,
    activity_type,
    points_earned,
    description,
    created_at
FROM public.activity_log
ORDER BY created_at DESC
LIMIT 20;

-- Проверяем типы данных
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('activity_points', 'activity_log', 'players')
  AND column_name IN ('user_id', 'id')
ORDER BY table_name, column_name;


