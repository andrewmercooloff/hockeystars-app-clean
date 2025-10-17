-- Очистка таблиц активности от старых данных

-- Удаляем все записи из activity_log
TRUNCATE TABLE public.activity_log;

-- Удаляем все записи из activity_points
TRUNCATE TABLE public.activity_points;

-- Проверяем что таблицы пустые
SELECT 'activity_points' as table_name, COUNT(*) as count FROM public.activity_points
UNION ALL
SELECT 'activity_log' as table_name, COUNT(*) as count FROM public.activity_log;


