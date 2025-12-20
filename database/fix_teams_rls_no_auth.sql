-- Исправление RLS политик для teams
-- Приложение не использует Supabase Auth, поэтому auth.uid() всегда NULL
-- Разрешаем создание команд для всех (публичное API)

-- 1. Удаляем старые политики для teams
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Anyone can insert teams" ON teams;
DROP POLICY IF EXISTS "Anyone can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Only admins can update teams" ON teams;
DROP POLICY IF EXISTS "Only admins can delete teams" ON teams;

-- 2. Создаём новые политики без проверки auth.uid()

-- Все могут читать команды
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

-- Все могут создавать команды (без авторизации)
CREATE POLICY "Anyone can insert teams" ON teams
  FOR INSERT WITH CHECK (true);

-- Все могут обновлять команды (название, город и т.д.)
CREATE POLICY "Anyone can update teams" ON teams
  FOR UPDATE USING (true);

-- 3. Убеждаемся, что RLS включен
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 4. Проверяем результат
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teams';






































