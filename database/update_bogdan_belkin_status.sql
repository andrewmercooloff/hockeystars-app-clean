-- Обновление статуса Bogdan Belkin с "player" на "star"
-- Выполните этот скрипт в Supabase SQL Editor

UPDATE players 
SET 
    status = 'star',
    updated_at = NOW()
WHERE 
    LOWER(name) LIKE '%bogdan%belkin%' 
    OR LOWER(name) LIKE '%belkin%bogdan%'
    OR (LOWER(name) LIKE '%bogdan%' AND LOWER(name) LIKE '%belkin%');

-- Проверка результата
SELECT 
    id,
    name,
    status,
    updated_at
FROM players 
WHERE 
    LOWER(name) LIKE '%bogdan%belkin%' 
    OR LOWER(name) LIKE '%belkin%bogdan%'
    OR (LOWER(name) LIKE '%bogdan%' AND LOWER(name) LIKE '%belkin%');




