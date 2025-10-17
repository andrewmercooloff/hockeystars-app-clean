-- ВРЕМЕННОЕ отключение RLS для команд (для диагностики)
-- Используйте это только для тестирования!

-- 1. Временно отключаем RLS для player_teams
ALTER TABLE player_teams DISABLE ROW LEVEL SECURITY;

-- 2. Временно отключаем RLS для teams  
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- 3. Проверяем результат
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('player_teams', 'teams')
ORDER BY tablename;

-- ВАЖНО: Это временное решение для диагностики!
-- После исправления проблемы нужно будет снова включить RLS
-- с правильными политиками

SELECT 'RLS временно отключен для команд - НЕ ЗАБУДЬТЕ ВКЛЮЧИТЬ ОБРАТНО!' as warning;
