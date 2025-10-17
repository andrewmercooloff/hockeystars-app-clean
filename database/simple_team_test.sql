-- Простое тестирование операций с командами (без синтаксических ошибок)

-- 1. Тест SELECT из player_teams
SELECT 
    'Тест SELECT player_teams' as test_name,
    COUNT(*) as total_records
FROM player_teams;

-- 2. Тест SELECT для текущего пользователя
SELECT 
    'Тест SELECT для пользователя' as test_name,
    auth.uid() as current_user_id,
    COUNT(*) as user_records
FROM player_teams
WHERE player_id = auth.uid();

-- 3. Проверяем есть ли записи команд для текущего пользователя
SELECT 
    'Записи пользователя в player_teams' as info,
    player_id,
    team_id,
    is_primary
FROM player_teams
WHERE player_id = auth.uid()
LIMIT 3;

-- 4. Тест SELECT из teams
SELECT 
    'Тест SELECT teams' as test_name,
    COUNT(*) as total_teams
FROM teams;

-- 5. Проверяем текущие политики
SELECT 
    'Политики player_teams' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'player_teams';

-- 6. Проверяем текущего пользователя
SELECT 
    'Текущий пользователь' as info,
    auth.uid() as user_id,
    pg_typeof(auth.uid()) as uid_type;

-- Готово - простые тесты без ошибок
