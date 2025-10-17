-- Глубокая диагностика проблем с командами
-- Найдем точную причину без отключения безопасности

-- 1. Проверяем структуру таблицы player_teams
SELECT 
    'Структура player_teams' as info,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'player_teams' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Проверяем структуру таблицы players (для сравнения)
SELECT 
    'Структура players.id' as info,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
AND table_schema = 'public'
AND column_name = 'id';

-- 3. Проверяем текущего пользователя и его тип
SELECT 
    'Текущий пользователь' as info,
    auth.uid() as user_id,
    pg_typeof(auth.uid()) as uid_type,
    auth.role() as user_role;

-- 4. Проверяем существует ли пользователь в таблице players
SELECT 
    'Пользователь в таблице players' as info,
    COUNT(*) as found_count,
    id,
    name
FROM players 
WHERE id = auth.uid()
GROUP BY id, name;

-- 5. Проверяем все текущие политики для player_teams
SELECT 
    'Политики player_teams' as info,
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'player_teams'
ORDER BY cmd, policyname;

-- 6. Тестируем каждую операцию отдельно

-- Тест SELECT (должен работать для всех)
SELECT 
    'Тест SELECT - общий' as test_name,
    COUNT(*) as total_records
FROM player_teams;

-- Тест SELECT для текущего пользователя
SELECT 
    'Тест SELECT - для текущего пользователя' as test_name,
    COUNT(*) as user_records
FROM player_teams
WHERE player_id = auth.uid();

-- 7. Проверяем есть ли записи в player_teams вообще
SELECT 
    'Все записи в player_teams' as info,
    player_id,
    team_id,
    is_primary
FROM player_teams
LIMIT 5;

-- 8. Проверяем внешние ключи и ограничения
SELECT 
    'Ограничения player_teams' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'player_teams'
AND table_schema = 'public';

-- 9. Проверяем права доступа к таблице
SELECT 
    'Права доступа' as info,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'player_teams'
AND table_schema = 'public';

-- Результат покажет точную причину проблемы
