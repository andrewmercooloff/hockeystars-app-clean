-- Безопасное исправление формата данных exercise_stats
-- Этот скрипт проверяет валидность JSON перед попыткой его обработки

-- 1. Сначала проверим, какие данные у нас есть
SELECT 
  'BEFORE_FIX' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as players_with_exercises,
  COUNT(CASE WHEN exercise_stats::text LIKE '{"completions":%' THEN 1 END) as players_with_new_format,
  COUNT(CASE WHEN exercise_stats::text LIKE '[{"exerciseId":%' THEN 1 END) as players_with_old_format
FROM players 
WHERE status = 'player';

-- 2. Показываем примеры проблемных данных (без парсинга JSON)
SELECT 
  'PROBLEMATIC_DATA' as status,
  id,
  name,
  CASE 
    WHEN exercise_stats::text LIKE '{"completions":%' THEN 'NEW_FORMAT'
    WHEN exercise_stats::text LIKE '[{"exerciseId":%' THEN 'OLD_FORMAT'
    WHEN exercise_stats IS NULL OR exercise_stats = '' OR exercise_stats = 'null' THEN 'EMPTY'
    ELSE 'UNKNOWN'
  END as format_type,
  SUBSTRING(exercise_stats::text, 1, 100) as preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
LIMIT 10;

-- 3. Безопасное исправление данных в старом формате
-- Используем функцию для проверки валидности JSON
DO $$
DECLARE
    player_record RECORD;
    old_stats TEXT;
    new_stats TEXT;
    completions_array JSON;
    completions_object JSON;
    total_completions INTEGER;
BEGIN
    -- Проходим по всем игрокам с данными в старом формате
    FOR player_record IN 
        SELECT id, exercise_stats
        FROM players 
        WHERE status = 'player'
          AND exercise_stats IS NOT NULL 
          AND exercise_stats != ''
          AND exercise_stats != 'null'
          AND exercise_stats::text LIKE '[{"exerciseId":%'
          AND exercise_stats::text NOT LIKE '{"completions":%'
    LOOP
        BEGIN
            -- Проверяем, что это валидный JSON
            old_stats := player_record.exercise_stats::text;
            
            -- Парсим массив completions
            completions_array := old_stats::json;
            
            -- Конвертируем в новый формат
            SELECT 
                json_object_agg(
                    completion->>'exerciseId', 
                    (completion->>'count')::int
                ),
                SUM((completion->>'count')::int)
            INTO completions_object, total_completions
            FROM json_array_elements(completions_array) as completion;
            
            -- Создаем новый объект
            new_stats := json_build_object(
                'completions', completions_object,
                'totalCompletions', total_completions
            )::text;
            
            -- Обновляем запись
            UPDATE players 
            SET exercise_stats = new_stats::json
            WHERE id = player_record.id;
            
            RAISE NOTICE 'Updated player %: converted old format to new format', player_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to update player %: %', player_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- 4. Проверяем результат исправления
SELECT 
  'AFTER_FIX' as status,
  COUNT(*) as total_players,
  COUNT(CASE WHEN exercise_stats IS NOT NULL AND exercise_stats != '' AND exercise_stats != 'null' THEN 1 END) as players_with_exercises,
  COUNT(CASE WHEN exercise_stats::text LIKE '{"completions":%' THEN 1 END) as players_with_new_format,
  COUNT(CASE WHEN exercise_stats::text LIKE '[{"exerciseId":%' THEN 1 END) as players_with_old_format
FROM players 
WHERE status = 'player';

-- 5. Показываем примеры исправленных данных
SELECT 
  'FIXED_DATA' as status,
  id,
  name,
  SUBSTRING(exercise_stats::text, 1, 100) as stats_preview
FROM players 
WHERE status = 'player' 
  AND exercise_stats IS NOT NULL 
  AND exercise_stats != ''
  AND exercise_stats != 'null'
  AND exercise_stats::text LIKE '{"completions":%'
LIMIT 5;
