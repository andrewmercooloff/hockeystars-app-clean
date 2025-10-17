-- Временное отключение RLS для таблиц активности
-- Это позволит системе работать пока мы разбираемся с политиками

ALTER TABLE public.activity_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- Проверяем, что RLS отключен
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('activity_points', 'activity_log');


