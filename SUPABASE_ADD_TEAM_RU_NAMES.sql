-- Добавляем поле name_ru в таблицу teams для русских названий команд
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS name_ru VARCHAR(255);

-- Обновляем существующие команды с русскими названиями
UPDATE teams SET name_ru = 'Пираньи' WHERE name = 'Piranhas';
UPDATE teams SET name_ru = 'Сборная Минской области' WHERE name = 'Minsk Region Team';
UPDATE teams SET name_ru = 'Сборная Беларуси U14' WHERE name = 'Belarus U14 National Team';
UPDATE teams SET name_ru = 'Boston Hockey Club' WHERE name = 'Boston Hockey Club';
UPDATE teams SET name_ru = 'Пчелки' WHERE name = 'Bees';

-- Удаляем старую функцию get_player_teams
DROP FUNCTION IF EXISTS get_player_teams(UUID);

-- Создаем новую функцию get_player_teams с поддержкой русского названия
CREATE FUNCTION get_player_teams(player_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name VARCHAR(255),
  team_name_ru VARCHAR(255),
  team_type VARCHAR(50),
  team_country VARCHAR(100),
  team_city VARCHAR(100),
  is_primary BOOLEAN,
  joined_date DATE,
  start_year INTEGER,
  end_year INTEGER,
  team_order INTEGER
) 
LANGUAGE plpgsql
AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.name_ru,
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
$func$;
