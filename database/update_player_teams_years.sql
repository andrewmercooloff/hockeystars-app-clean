-- Добавление полей для годов в таблицу player_teams
-- Этот скрипт нужно выполнить на существующей базе данных

-- Добавляем поля для годов
ALTER TABLE player_teams 
ADD COLUMN IF NOT EXISTS start_year INTEGER,
ADD COLUMN IF NOT EXISTS end_year INTEGER;

-- Обновляем функцию get_player_teams для возврата новых полей
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
  end_year INTEGER
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
    pt.end_year
  FROM player_teams pt
  JOIN teams t ON pt.team_id = t.id
  WHERE pt.player_id = player_uuid
  ORDER BY pt.is_primary DESC, t.name;
END;
$$ LANGUAGE plpgsql;

-- Устанавливаем значения по умолчанию для существующих записей
-- Для текущих команд (is_primary = true) устанавливаем текущий год как start_year
UPDATE player_teams 
SET start_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE is_primary = true AND start_year IS NULL;

-- Для прошлых команд (is_primary = false) устанавливаем текущий год как start_year
-- и предыдущий год как end_year, если end_year не установлен
UPDATE player_teams 
SET 
  start_year = EXTRACT(YEAR FROM CURRENT_DATE) - 1,
  end_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE is_primary = false AND start_year IS NULL;

-- Устанавливаем end_year = NULL для текущих команд
UPDATE player_teams 
SET end_year = NULL
WHERE is_primary = true;

-- Комментарий: После выполнения этого скрипта все существующие команды получат
-- временные значения годов. Пользователям нужно будет отредактировать свои команды
-- и установить правильные годы. 