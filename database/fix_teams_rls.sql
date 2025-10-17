-- Исправление RLS политик для системы команд
-- Проблема: политики используют auth.uid(), но мы не используем Supabase Auth

-- Удаляем старые политики
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;

-- Создаем новые политики без проверки auth.uid()
-- Разрешаем всем аутентифицированным пользователям добавлять команды
CREATE POLICY "Teams can be inserted by anyone" ON teams
  FOR INSERT WITH CHECK (true);

-- Разрешаем всем пользователям управлять связями игрок-команда
CREATE POLICY "Anyone can manage team associations" ON player_teams
  FOR ALL USING (true);

-- Альтернативно, можно полностью отключить RLS для этих таблиц
-- ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE player_teams DISABLE ROW LEVEL SECURITY; 