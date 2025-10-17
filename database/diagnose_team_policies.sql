-- Диагностика проблем с политиками команд
-- Проверяем текущее состояние политик и прав доступа

-- 1. Проверяем все политики для player_teams
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'player_teams'
ORDER BY cmd, policyname;

-- 2. Проверяем все политики для teams
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'teams'
ORDER BY cmd, policyname;

-- 3. Проверяем включен ли RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('player_teams', 'teams');

-- 4. Проверяем структуру таблицы player_teams
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'player_teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Тестируем простой SELECT от текущего пользователя
SELECT 
    'Тест SELECT player_teams' as test_name,
    COUNT(*) as record_count
FROM player_teams
WHERE player_id = auth.uid();

-- 6. Проверяем права текущего пользователя
SELECT 
    'Текущий пользователь' as info,
    auth.uid() as user_id,
    auth.role() as user_role;

-- Результат диагностики поможет понять где проблема
