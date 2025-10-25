-- Простое исправление данных упражнений (только текстовые операции)
-- Этот скрипт работает только с текстом, без попыток парсинга JSON

-- 1. Сначала проверим, что у нас есть
SELECT 
  'BEFORE_FIX' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats::text != '' AND exercise_stats::text != 'null' THEN 1 END) as players_with_exercises,
  COUNT(CASE WHEN exercise_stats::text LIKE '{"completions":%' THEN 1 END) as players_with_new_format,
  COUNT(CASE WHEN exercise_stats::text LIKE '[{"exerciseId":%' THEN 1 END) as players_with_old_format
FROM players 
WHERE status = 'player';

-- 2. Показываем примеры данных в старом формате
SELECT 
  'OLD_FORMAT_EXAMPLES' as status,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 150) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[{"exerciseId":%'
  AND exercise_stats::text NOT LIKE '{"completions":%'
LIMIT 5;

-- 3. ВНИМАНИЕ: Этот скрипт НЕ будет автоматически исправлять данные
-- Потому что для безопасного исправления нужно парсить JSON
-- Вместо этого мы покажем, какие данные нужно исправить

-- 4. Показываем игроков, у которых данные в старом формате
SELECT 
  'NEEDS_FIXING' as status,
  id,
  name,
  'OLD_FORMAT' as format_type,
  SUBSTRING(exercise_stats::text, 1, 200) as full_data
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '[{"exerciseId":%'
  AND exercise_stats::text NOT LIKE '{"completions":%';

-- 5. Показываем игроков, у которых данные уже в новом формате
SELECT 
  'ALREADY_CORRECT' as status,
  id,
  name,
  'NEW_FORMAT' as format_type,
  SUBSTRING(exercise_stats::text, 1, 200) as full_data
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats::text != ''
  AND exercise_stats::text != 'null'
  AND exercise_stats::text LIKE '{"completions":%'
LIMIT 5;

-- 6. Показываем игроков с пустыми данными
SELECT 
  'EMPTY_DATA' as status,
  id,
  name,
  'EMPTY' as format_type,
  'No exercise data' as full_data
FROM players 
WHERE status = 'player' 
  AND (exercise_stats IS NULL OR exercise_stats::text = '' OR exercise_stats::text = 'null');

-- 7. Итоговая статистика
SELECT 
  'SUMMARY' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats::text != '' AND exercise_stats::text != 'null' THEN 1 END) as players_with_data,
  COUNT(CASE WHEN exercise_stats::text LIKE '{"completions":%' THEN 1 END) as correct_format,
  COUNT(CASE WHEN exercise_stats::text LIKE '[{"exerciseId":%' AND exercise_stats::text NOT LIKE '{"completions":%' THEN 1 END) as needs_fixing,
  COUNT(CASE WHEN exercise_stats IS NULL OR exercise_stats::text = '' OR exercise_stats::text = 'null' THEN 1 END) as empty_data
FROM players 
WHERE status = 'player';
