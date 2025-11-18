-- Проверка позиций в базе данных
-- Выполнить в Supabase SQL Editor для проверки текущих значений

-- Показываем всех игроков с различными позициями (все возможные варианты)
SELECT 
    id,
    name,
    position,
    LOWER(TRIM(position)) as position_lower
FROM players
WHERE position IS NOT NULL
ORDER BY position, name;

-- Показываем конкретно Artem Korako
SELECT 
    id,
    name,
    position,
    LOWER(TRIM(position)) as position_lower
FROM players
WHERE name ILIKE '%Artem%Korako%' OR name ILIKE '%Korako%';

-- Показываем статистику по позициям (сколько игроков в каждой позиции)
SELECT 
    position,
    COUNT(*) as count
FROM players
WHERE position IS NOT NULL
GROUP BY position
ORDER BY count DESC;

