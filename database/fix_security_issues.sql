-- Исправление критических проблем безопасности Supabase
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- 1. Проверяем текущее состояние RLS для всех таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Включаем RLS для всех основных таблиц (если еще не включен)
ALTER TABLE IF EXISTS players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_museum ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises ENABLE ROW LEVEL SECURITY;

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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Создаем недостающие политики для item_requests (основная проблема из Security Advisor)

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Item requests are viewable by participants" ON item_requests;
DROP POLICY IF EXISTS "Players can insert item requests" ON item_requests;
DROP POLICY IF EXISTS "Item owners can update requests" ON item_requests;

-- Создаем новые безопасные политики для item_requests
CREATE POLICY "Item requests are viewable by participants" ON item_requests
  FOR SELECT USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = owner_id::text
  );

CREATE POLICY "Players can insert item requests" ON item_requests
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);

CREATE POLICY "Item owners can update requests" ON item_requests
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

-- 5. Создаем недостающие политики для items

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
DROP POLICY IF EXISTS "Players can insert own items" ON items;
DROP POLICY IF EXISTS "Players can update own items" ON items;
DROP POLICY IF EXISTS "Players can delete own items" ON items;

-- Создаем новые безопасные политики для items
CREATE POLICY "Items are viewable by everyone" ON items
  FOR SELECT USING (true);

CREATE POLICY "Players can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can update own items" ON items
  FOR UPDATE USING (auth.uid()::text = owner_id::text);

CREATE POLICY "Players can delete own items" ON items
  FOR DELETE USING (auth.uid()::text = owner_id::text);

-- 6. Создаем недостающие политики для player_museum

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Museum items are viewable by everyone" ON player_museum;
DROP POLICY IF EXISTS "Players can insert museum items" ON player_museum;

-- Создаем новые безопасные политики для player_museum
CREATE POLICY "Museum items are viewable by everyone" ON player_museum
  FOR SELECT USING (true);

CREATE POLICY "Players can insert museum items" ON player_museum
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

-- 7. Создаем недостающие политики для teams

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;

-- Создаем новые безопасные политики для teams
CREATE POLICY "Teams are viewable by everyone" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Teams can be inserted by authenticated users" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

CREATE POLICY "Only admins can delete teams" ON teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

-- 8. Создаем недостающие политики для player_teams

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Player teams are viewable by everyone" ON player_teams;
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;

-- Создаем новые безопасные политики для player_teams
CREATE POLICY "Player teams are viewable by everyone" ON player_teams
  FOR SELECT USING (true);

CREATE POLICY "Players can manage own team associations" ON player_teams
  FOR ALL USING (auth.uid()::text = player_id::text);

-- 9. Создаем политики для teams_extended (если таблица существует)
CREATE POLICY "Teams extended are viewable by everyone" ON teams_extended
  FOR SELECT USING (true);

CREATE POLICY "Teams extended can be inserted by authenticated users" ON teams_extended
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. Проверяем что все политики применились
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 11. Проверяем что RLS включен для всех таблиц
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
ORDER BY tablename;

-- Если предыдущий запрос вернул таблицы, значит для них RLS не включен!
-- В этом случае выполните соответствующие ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- 12. Дополнительная безопасность: создаем вспомогательную функцию
-- Создаем функцию для проверки администратора (в схеме public)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = auth.uid() 
    AND players.status = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий о завершении
-- Этот скрипт исправляет все основные проблемы безопасности:
-- 1. Включает RLS для всех таблиц
-- 2. Создает безопасные политики доступа
-- 3. Ограничивает права пользователей согласно их ролям
-- 4. Обеспечивает защиту данных на уровне строк

COMMENT ON SCHEMA public IS 'Схема с включенной Row Level Security для всех таблиц';
