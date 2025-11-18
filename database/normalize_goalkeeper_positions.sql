-- Нормализация всех позиций в базе данных
-- Приводит все варианты написания позиций к стандартным английским ключам
-- Выполнить в Supabase SQL Editor

-- Обновляем все варианты написания вратаря к стандартному ключу 'goalie'
UPDATE players
SET position = 'goalie',
    updated_at = NOW()
WHERE LOWER(TRIM(COALESCE(position, ''))) IN ('goalkeeper', 'goalie')
   OR position IN ('Goalkeeper', 'Goalie', 'goalie', 'GOALIE', 'Вратарь');

-- Обновляем центрального нападающего к 'center'
UPDATE players
SET position = 'center',
    updated_at = NOW()
WHERE position IN ('Центральный нападающий', 'Center', 'center', 'CENTER');

-- Обновляем крайнего нападающего к 'winger'
UPDATE players
SET position = 'winger',
    updated_at = NOW()
WHERE position IN ('Крайний нападающий', 'Winger', 'winger', 'WINGER');

-- Обновляем защитника к 'defender'
UPDATE players
SET position = 'defender',
    updated_at = NOW()
WHERE position IN ('Защитник', 'Defender', 'defender', 'DEFENDER');

-- Проверяем результат (опционально, можно выполнить для проверки)
-- SELECT id, name, position 
-- FROM players 
-- WHERE position IS NOT NULL
-- ORDER BY position, name;

