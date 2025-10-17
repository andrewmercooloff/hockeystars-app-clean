-- Добавление поля order в таблицу player_teams для сохранения порядка команд
ALTER TABLE player_teams 
ADD COLUMN team_order INTEGER DEFAULT 0;

-- Создание индекса для оптимизации сортировки
CREATE INDEX idx_player_teams_order ON player_teams(player_id, team_order);

-- Обновление существующих записей - устанавливаем порядок на основе created_at
UPDATE player_teams 
SET team_order = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at) as row_number
  FROM player_teams
) AS subquery
WHERE player_teams.id = subquery.id;
