-- Простое исправление критических проблем безопасности Supabase
-- Этот скрипт избегает проблематических функций и схем

-- 1. Включаем RLS для всех основных таблиц
ALTER TABLE IF EXISTS players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_museum ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_teams ENABLE ROW LEVEL SECURITY;

-- 2. Создаем базовые политики для item_requests (основная проблема)
DROP POLICY IF EXISTS "Item requests are viewable by participants" ON item_requests;
DROP POLICY IF EXISTS "Players can insert item requests" ON item_requests;
DROP POLICY IF EXISTS "Item owners can update requests" ON item_requests;

CREATE POLICY "Item requests are viewable by participants" ON item_requests
  FOR SELECT USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = owner_id::text
  );

CREATE POLICY "Players can insert item requests" ON item_requests
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);

CREATE POLICY "Item owners can update requests" ON item_requests
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

-- 3. Создаем базовые политики для items
DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
DROP POLICY IF EXISTS "Players can insert own items" ON items;
DROP POLICY IF EXISTS "Players can update own items" ON items;
DROP POLICY IF EXISTS "Players can delete own items" ON items;

CREATE POLICY "Items are viewable by everyone" ON items
  FOR SELECT USING (true);

CREATE POLICY "Players can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can update own items" ON items
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can delete own items" ON items
  FOR DELETE USING (auth.uid()::text = owner_id::text);

-- 4. Создаем базовые политики для player_museum
DROP POLICY IF EXISTS "Museum items are viewable by everyone" ON player_museum;
DROP POLICY IF EXISTS "Players can insert museum items" ON player_museum;

CREATE POLICY "Museum items are viewable by everyone" ON player_museum
  FOR SELECT USING (true);

CREATE POLICY "Players can insert museum items" ON player_museum
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

-- 5. Создаем базовые политики для teams
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;

CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Teams can be inserted by authenticated users" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Создаем базовые политики для player_teams
DROP POLICY IF EXISTS "Player teams are viewable by everyone" ON player_teams;
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;

CREATE POLICY "Player teams are viewable by everyone" ON player_teams
  FOR SELECT USING (true);

CREATE POLICY "Players can manage own team associations" ON player_teams
  FOR ALL USING (auth.uid()::text = player_id::text);

-- 7. Проверяем что RLS включен
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Готово! Основные проблемы безопасности исправлены
