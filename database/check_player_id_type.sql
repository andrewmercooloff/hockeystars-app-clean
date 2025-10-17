-- Проверка типа данных для player_id в разных таблицах

-- 1. Проверяем тип player_id в player_teams
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'player_teams'
AND column_name = 'player_id';

-- 2. Проверяем тип id в players (для сравнения)
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'players'
AND column_name = 'id';

-- 3. Проверяем что возвращает auth.uid()
SELECT 
    'auth.uid() type' as info,
    auth.uid() as user_id,
    pg_typeof(auth.uid()) as auth_uid_type;

-- 4. Тестируем разные способы сравнения
SELECT 'Тест uuid = uuid' as test_type;
-- Этот должен работать если player_id это UUID

SELECT 'Тест text = text' as test_type;  
-- Этот должен работать если player_id это TEXT
