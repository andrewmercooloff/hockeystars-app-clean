-- Полностью безопасная проверка данных упражнений (только текст, без JSON)
-- Этот скрипт не пытается работать с JSON вообще

-- 1. Проверяем общую статистику по игрокам (только текстовые операции)
SELECT 
  'PLAYERS_STATS' as check_type,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NULL THEN 1 END) as null_stats,
  COUNT(CASE WHEN exercise_stats::text = '' THEN 1 END) as empty_stats,
  COUNT(CASE WHEN exercise_stats::text = 'null' THEN 1 END) as null_string_stats,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats::text != '' AND exercise_stats::text != 'null' THEN 1 END) as has_data
FROM players 
WHERE status = 'player';

-- 2. Проверяем примеры данных exercise_stats (только как текст)
SELECT 
  'SAMPLE_DATA' as check_type,
  id,
  name,
  CASE 
    WHEN exercise_stats IS NULL THEN 'NULL'
    WHEN exercise_stats::text = '' THEN 'EMPTY'
    WHEN exercise_stats::text = 'null' THEN 'NULL_STRING'
    ELSE 'HAS_DATA'
  END as stats_status,
  LENGTH(exercise_stats::text) as stats_length,
  SUBSTRING(exercise_stats::text, 1, 50) as stats_preview
FROM players 
WHERE status = 'player' 
  AND (exercise_stats IS NOT NULL AND exercise_stats::text != '')
LIMIT 10;

-- 3. Проверяем, есть ли данные, которые выглядят как JSON объекты (по тексту)
SELECT 
  'JSON_OBJECT_LIKE' as check_type,
  COUNT(*) as json_object_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '{%'
  AND exercise_stats::text LIKE '%}';

-- 4. Проверяем, есть ли данные, которые выглядят как JSON массивы (по тексту)
SELECT 
  'JSON_ARRAY_LIKE' as check_type,
  COUNT(*) as json_array_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[%'
  AND exercise_stats::text LIKE '%]';

-- 5. Проверяем, есть ли данные в новом формате (по тексту)
SELECT 
  'NEW_FORMAT_LIKE' as check_type,
  COUNT(*) as new_format_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '{"completions":%';

-- 6. Проверяем, есть ли данные в старом формате (по тексту)
SELECT 
  'OLD_FORMAT_LIKE' as check_type,
  COUNT(*) as old_format_count
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[{"exerciseId":%';

-- 7. Показываем примеры данных, которые выглядят как JSON объекты
SELECT 
  'JSON_OBJECT_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '{%'
  AND exercise_stats::text LIKE '%}'
LIMIT 5;

-- 8. Показываем примеры данных, которые выглядят как массивы
SELECT 
  'JSON_ARRAY_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[%'
  AND exercise_stats::text LIKE '%]'
LIMIT 5;

-- 9. Показываем примеры данных в новом формате
SELECT 
  'NEW_FORMAT_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '{"completions":%'
LIMIT 5;

-- 10. Показываем примеры данных в старом формате
SELECT 
  'OLD_FORMAT_SAMPLES' as check_type,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[{"exerciseId":%'
LIMIT 5;
