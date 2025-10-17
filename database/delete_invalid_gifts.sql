-- Удаление некорректных подарков без изображения для Ivan Merkulov

-- 1. Сначала посмотрим, что удалим
SELECT 
    pm.id as museum_record_id,
    i.id as item_id,
    i.name as item_name,
    i.image_url,
    p.name as player_name
FROM player_museum pm
JOIN items i ON i.id = pm.item_id
JOIN players p ON p.id = pm.player_id
WHERE p.name ILIKE '%IVAN%MERKULOV%'
  AND i.image_url IS NULL;

-- 2. Удаляем записи из музея
DELETE FROM player_museum
WHERE id IN (
    SELECT pm.id
    FROM player_museum pm
    JOIN items i ON i.id = pm.item_id
    JOIN players p ON p.id = pm.player_id
    WHERE p.name ILIKE '%IVAN%MERKULOV%'
      AND i.image_url IS NULL
);

-- 3. Удаляем сами предметы без изображения
DELETE FROM items
WHERE id IN (
    SELECT i.id
    FROM items i
    JOIN players p ON p.id = i.owner_id
    WHERE p.name ILIKE '%IVAN%MERKULOV%'
      AND i.image_url IS NULL
);

-- 4. Проверяем результат
SELECT 
    p.name as player_name,
    i.name as item_name,
    i.image_url
FROM player_museum pm
JOIN players p ON p.id = pm.player_id
JOIN items i ON i.id = pm.item_id
WHERE p.name ILIKE '%MERKULOV%'
ORDER BY pm.received_at DESC;


