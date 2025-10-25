-- Исправление формата данных exercise_stats в базе данных
-- Этот скрипт исправляет неправильно сохраненные данные упражнений

-- 1. Проверяем текущее состояние данных
SELECT 
  'BEFORE FIX' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as players_with_exercises,
  COUNT(CASE WHEN exercise_stats LIKE '%"completions":%' THEN 1 END) as players_with_new_format,
  COUNT(CASE WHEN exercise_stats LIKE '%"exerciseId":%' THEN 1 END) as players_with_old_format
FROM players 
WHERE status = 'player';

-- 2. Показываем примеры проблемных данных
SELECT 
  id,
  name,
  exercise_stats,
  CASE 
    WHEN exercise_stats LIKE '%"completions":%' THEN 'NEW_FORMAT'
    WHEN exercise_stats LIKE '%"exerciseId":%' THEN 'OLD_FORMAT'
    WHEN exercise_stats IS NULL OR exercise_stats = '' OR exercise_stats = 'null' THEN 'EMPTY'
    ELSE 'UNKNOWN'
  END as format_type
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
LIMIT 10;

-- 3. Исправляем данные в старом формате (если есть)
-- Конвертируем старый формат [{exerciseId, completedAt, count}] в новый {exerciseId: count}
UPDATE players 
SET exercise_stats = (
  SELECT json_build_object(
    'completions', 
    json_object_agg(
      completion->>'exerciseId', 
      (completion->>'count')::int
    ),
    'totalCompletions',
    SUM((completion->>'count')::int)
  )
  FROM json_array_elements(exercise_stats::json->'completions') as completion
)
WHERE status = 'player'
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats LIKE '%"exerciseId":%'
  AND exercise_stats NOT LIKE '%"completions":%';

-- 4. Проверяем результат исправления
SELECT 
  'AFTER FIX' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as players_with_exercises,
  COUNT(CASE WHEN exercise_stats LIKE '%"completions":%' THEN 1 END) as players_with_new_format,
  COUNT(CASE WHEN exercise_stats LIKE '%"exerciseId":%' THEN 1 END) as players_with_old_format
FROM players 
WHERE status = 'player';

-- 5. Показываем примеры исправленных данных
SELECT 
  id,
  name,
  exercise_stats,
  'FIXED' as status
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats LIKE '%"completions":%'
LIMIT 5;
