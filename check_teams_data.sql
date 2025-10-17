-- Проверяем данные в таблице player_teams
SELECT 
  pt.player_id,
  pt.team_id,
  pt.is_primary,
  pt.team_order,
  t.name as team_name
FROM player_teams pt
LEFT JOIN teams t ON pt.team_id = t.id
ORDER BY pt.player_id, pt.team_order;

-- Проверяем, есть ли поле team_order
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'player_teams' 
AND column_name = 'team_order';

-- Проверяем количество записей
SELECT COUNT(*) as total_teams FROM player_teams;
