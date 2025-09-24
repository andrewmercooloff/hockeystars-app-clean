-- Добавление поля team_order в таблицу player_teams
ALTER TABLE player_teams 
ADD COLUMN IF NOT EXISTS team_order INTEGER DEFAULT 0;

-- Создание индекса для оптимизации сортировки
CREATE INDEX IF NOT EXISTS idx_player_teams_order ON player_teams(player_id, team_order);

-- Обновление существующих записей - устанавливаем порядок на основе created_at
UPDATE player_teams 
SET team_order = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at) as row_number
  FROM player_teams
) AS subquery
WHERE player_teams.id = subquery.id;

-- Обновляем функцию get_player_teams для поддержки поля team_order
CREATE OR REPLACE FUNCTION get_player_teams(player_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name VARCHAR(255),
  team_type VARCHAR(50),
  team_country VARCHAR(100),
  team_city VARCHAR(100),
  is_primary BOOLEAN,
  joined_date DATE,
  start_year INTEGER,
  end_year INTEGER,
  team_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.country,
    t.city,
    pt.is_primary,
    pt.joined_date,
    pt.start_year,
    pt.end_year,
    COALESCE(pt.team_order, 0) as team_order
  FROM player_teams pt
  JOIN teams t ON pt.team_id = t.id
  WHERE pt.player_id = player_uuid
  ORDER BY COALESCE(pt.team_order, 0), pt.is_primary DESC, COALESCE(pt.start_year, 0) DESC, t.name;
END;
$$ LANGUAGE plpgsql;
