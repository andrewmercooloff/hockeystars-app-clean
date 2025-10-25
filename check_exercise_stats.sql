-- Проверяем структуру данных упражнений в базе
-- Этот скрипт поможет понять, как хранятся данные о выполнении упражнений

-- 1. Проверяем структуру таблицы players и поле exercise_stats
SELECT 
  id,
  name,
  status,
  exercise_stats,
  CASE 
    WHEN exercise_stats IS NULL THEN 'NULL'
    WHEN exercise_stats = '' THEN 'EMPTY'
    ELSE 'HAS_DATA'
  END as stats_status
FROM players 
WHERE status = 'player' 
  AND (exercise_stats IS NOT NULL OR exercise_stats != '')
LIMIT 10;

-- 2. Проверяем примеры данных exercise_stats
SELECT 
  id,
  name,
  exercise_stats
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
LIMIT 5;

-- 3. Проверяем, есть ли игроки с выполненными упражнениями
SELECT 
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as players_with_exercises
FROM players 
WHERE status = 'player';

-- 4. Проверяем формат данных exercise_stats (если есть)
SELECT 
  id,
  name,
  exercise_stats,
  LENGTH(exercise_stats) as stats_length,
  SUBSTRING(exercise_stats, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
LIMIT 3;
