-- Скрипт для отладки RLS политик

-- 1. Проверяем текущие данные
SELECT 
    'auth.uid() type' as check_type,
    pg_typeof(auth.uid()) as result;

-- 2. Проверяем тип поля id в players
SELECT 
    'players.id type' as check_type,
    data_type as result
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'players' 
AND column_name = 'id';

-- 3. Проверяем существующие политики
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('activity_points', 'activity_log')
ORDER BY tablename, policyname;

-- 4. Временно отключаем RLS для тестирования
ALTER TABLE public.activity_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- Теперь попробуйте войти в приложение - ошибок быть не должно
-- После этого можно включить RLS обратно


