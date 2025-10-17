-- Проверка текущих данных активности

-- Показываем все записи activity_points
SELECT 
    user_id,
    points,
    last_activity_date,
    created_at,
    updated_at
FROM public.activity_points
ORDER BY updated_at DESC;

-- Показываем последние 10 записей activity_log
SELECT 
    user_id,
    activity_type,
    points_earned,
    description,
    created_at
FROM public.activity_log
ORDER BY created_at DESC
LIMIT 10;


