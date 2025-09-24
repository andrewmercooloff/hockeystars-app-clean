-- ВЫПОЛНИТЕ ЭТОТ SQL В SUPABASE SQL EDITOR

-- 1. Добавляем поле team_order в таблицу player_teams
ALTER TABLE player_teams 
ADD COLUMN IF NOT EXISTS team_order INTEGER DEFAULT 0;

-- 2. Создаем индекс для оптимизации сортировки
CREATE INDEX IF NOT EXISTS idx_player_teams_order ON player_teams(player_id, team_order);

-- 3. Обновляем существующие записи - устанавливаем порядок на основе created_at
UPDATE player_teams 
SET team_order = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at) as row_number
  FROM player_teams
) AS subquery
WHERE player_teams.id = subquery.id;

-- 4. Удаляем старую функцию get_player_teams
DROP FUNCTION IF EXISTS get_player_teams(UUID);
