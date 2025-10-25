-- Безопасная проверка структуры данных упражнений в базе
-- Этот скрипт не пытается парсить JSON, чтобы избежать ошибок

-- 1. Проверяем общую статистику по игрокам
SELECT 
  'PLAYERS_STATS' as check_type,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NULL THEN 1 END) as null_stats,
  COUNT(CASE WHEN exercise_stats = '' THEN 1 END) as empty_stats,
  COUNT(CASE WHEN exercise_stats = 'null' THEN 1 END) as null_string_stats,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as has_data
FROM players 
WHERE status = 'player';

-- 2. Проверяем примеры данных exercise_stats (без парсинга JSON)
SELECT 
  'SAMPLE_DATA' as check_type,
  id,
  name,
  CASE 
    WHEN exercise_stats IS NULL THEN 'NULL'
    WHEN exercise_stats = '' THEN 'EMPTY'
    WHEN exercise_stats = 'null' THEN 'NULL_STRING'
    ELSE 'HAS_DATA'
  END as stats_status,
  LENGTH(exercise_stats::text) as stats_length,
  SUBSTRING(exercise_stats::text, 1, 50) as stats_preview
FROM players 
WHERE status = 'player' 
  AND (exercise_stats IS NOT NULL AND exercise_stats != '')
LIMIT 10;

-- 3. Проверяем, есть ли данные, которые выглядят как JSON
SELECT 
  'JSON_LIKE_DATA' as check_type,
  COUNT(*) as json_like_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats::text LIKE '{%'
  AND exercise_stats::text LIKE '%}';

-- 4. Проверяем, есть ли данные, которые выглядят как массив
SELECT 
  'ARRAY_LIKE_DATA' as check_type,
  COUNT(*) as array_like_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats::text LIKE '[%'
  AND exercise_stats::text LIKE '%]';

-- 5. Показываем примеры данных, которые выглядят как JSON объекты
SELECT 
  'JSON_OBJECT_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats::text LIKE '{%'
  AND exercise_stats::text LIKE '%}'
LIMIT 5;

-- 6. Показываем примеры данных, которые выглядят как массивы
SELECT 
  'JSON_ARRAY_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats::text LIKE '[%'
  AND exercise_stats::text LIKE '%]'
LIMIT 5;
