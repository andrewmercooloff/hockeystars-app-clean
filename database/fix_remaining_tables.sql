-- Исправление оставшихся 3 таблиц из Security Advisor
-- teams_extended, tournaments, hockey_shops

-- 1. Включаем RLS для оставшихся таблиц
ALTER TABLE IF EXISTS teams_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hockey_shops ENABLE ROW LEVEL SECURITY;

-- 2. Создаем политики для teams_extended
DROP POLICY IF EXISTS "Teams extended are viewable by everyone" ON teams_extended;
DROP POLICY IF EXISTS "Teams extended can be inserted by authenticated users" ON teams_extended;

CREATE POLICY "Teams extended are viewable by everyone" ON teams_extended
  FOR SELECT USING (true);

CREATE POLICY "Teams extended can be inserted by authenticated users" ON teams_extended
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Создаем политики для tournaments
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON tournaments;
DROP POLICY IF EXISTS "Tournaments can be inserted by authenticated users" ON tournaments;

CREATE POLICY "Tournaments are viewable by everyone" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Tournaments can be inserted by authenticated users" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Создаем политики для hockey_shops
DROP POLICY IF EXISTS "Hockey shops are viewable by everyone" ON hockey_shops;
DROP POLICY IF EXISTS "Hockey shops can be inserted by authenticated users" ON hockey_shops;

CREATE POLICY "Hockey shops are viewable by everyone" ON hockey_shops
  FOR SELECT USING (true);

CREATE POLICY "Hockey shops can be inserted by authenticated users" ON hockey_shops
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Проверяем что RLS включен для всех таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams_extended', 'tournaments', 'hockey_shops')
ORDER BY tablename;

-- Готово! Все оставшиеся таблицы защищены
