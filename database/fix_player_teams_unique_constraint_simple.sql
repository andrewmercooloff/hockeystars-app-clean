-- Упрощенная версия исправления ограничения уникальности для таблицы player_teams
-- Разрешаем игроку играть в одной команде в разные годы

-- Удаляем старое ограничение уникальности
ALTER TABLE player_teams DROP CONSTRAINT IF EXISTS player_teams_player_id_team_id_key;

-- Создаем новое ограничение уникальности, которое учитывает годы
-- Игрок может быть в одной команде только один раз в один период времени
ALTER TABLE player_teams 
ADD CONSTRAINT player_teams_player_team_years_unique 
UNIQUE (player_id, team_id, start_year, end_year);

-- Добавляем проверку, что годы не пересекаются для одного игрока в одной команде
-- Создаем функцию для проверки пересечения годов
CREATE OR REPLACE FUNCTION check_team_years_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, есть ли пересечение годов с существующими записями
  IF EXISTS (
    SELECT 1 FROM player_teams 
    WHERE player_id = NEW.player_id 
      AND team_id = NEW.team_id
      AND id != NEW.id
      AND (
        -- Проверяем пересечение годов
        (NEW.start_year IS NOT NULL AND NEW.end_year IS NOT NULL AND
         NEW.start_year <= COALESCE(end_year, 9999) AND 
         NEW.end_year >= COALESCE(start_year, 0))
        OR
        (NEW.start_year IS NULL AND NEW.end_year IS NULL AND
         start_year IS NULL AND end_year IS NULL)
        OR
        (NEW.start_year IS NOT NULL AND NEW.end_year IS NULL AND
         start_year IS NOT NULL AND end_year IS NULL AND
         NEW.start_year <= start_year)
        OR
        (NEW.start_year IS NULL AND NEW.end_year IS NOT NULL AND
         start_year IS NULL AND end_year IS NOT NULL AND
         NEW.end_year >= end_year)
      )
  ) THEN
    RAISE EXCEPTION 'Игрок уже состоит в этой команде в указанный период времени';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для проверки пересечения годов
DROP TRIGGER IF EXISTS check_team_years_overlap_trigger ON player_teams;
CREATE TRIGGER check_team_years_overlap_trigger
  BEFORE INSERT OR UPDATE ON player_teams
  FOR EACH ROW
  EXECUTE FUNCTION check_team_years_overlap();

-- Обновляем существующие записи, чтобы у них были уникальные годы
-- Для записей без годов устанавливаем текущий год как start_year
UPDATE player_teams 
SET start_year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE start_year IS NULL;

-- Простое решение для дублирующихся годов - добавляем 1 к start_year для дубликатов
-- Это проще и надежнее, чем сложные оконные функции
UPDATE player_teams 
SET start_year = start_year + 1
WHERE id IN (
  SELECT pt1.id
  FROM player_teams pt1
  JOIN (
    SELECT player_id, team_id, start_year, end_year
    FROM player_teams
    WHERE start_year IS NOT NULL
    GROUP BY player_id, team_id, start_year, end_year
    HAVING COUNT(*) > 1
  ) duplicates ON 
    pt1.player_id = duplicates.player_id 
    AND pt1.team_id = duplicates.team_id 
    AND pt1.start_year = duplicates.start_year 
    AND pt1.end_year = duplicates.end_year
  WHERE pt1.id != (
    SELECT MIN(pt2.id)
    FROM player_teams pt2
    WHERE pt2.player_id = pt1.player_id 
      AND pt2.team_id = pt1.team_id 
      AND pt2.start_year = pt1.start_year 
      AND pt2.end_year = pt1.end_year
  )
);

-- Создаем индекс для улучшения производительности запросов по годам
CREATE INDEX IF NOT EXISTS idx_player_teams_years 
ON player_teams (player_id, team_id, start_year, end_year);

-- Обновляем функцию get_player_teams для корректной работы с новой структурой
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
  ORDER BY pt.is_primary DESC, COALESCE(pt.start_year, 0) DESC, t.name;
END;
$$ LANGUAGE plpgsql;
