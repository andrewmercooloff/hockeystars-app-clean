-- Очищаем таблицы активности для чистого старта

TRUNCATE TABLE public.activity_log;
TRUNCATE TABLE public.activity_points;

-- Проверяем результат
SELECT COUNT(*) as log_count FROM public.activity_log;
SELECT COUNT(*) as points_count FROM public.activity_points;



