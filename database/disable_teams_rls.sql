-- Полное отключение RLS для таблиц команд
-- Это самый простой способ решить проблему с политиками

-- Отключаем RLS для таблиц команд
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams DISABLE ROW LEVEL SECURITY;

-- Удаляем все политики для этих таблиц
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Teams can be inserted by anyone" ON teams;

DROP POLICY IF EXISTS "Player teams are viewable by everyone" ON player_teams;
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;
DROP POLICY IF EXISTS "Anyone can manage team associations" ON player_teams; 