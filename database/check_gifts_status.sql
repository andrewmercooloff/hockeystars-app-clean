-- Проверка статуса подарков и музея

-- 1. Проверяем RLS политики для items
SELECT 
    'items' as table_name,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'items'
ORDER BY policyname;

-- 2. Проверяем RLS политики для player_museum
SELECT 
    'player_museum' as table_name,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'player_museum'
ORDER BY policyname;

-- 3. Проверяем, есть ли подарки у звезды Egor Sharangovich
SELECT 
    p.name as star_name,
    i.id,
    i.name as item_name,
    i.item_type,
    i.image_url,
    i.is_available,
    i.created_at
FROM items i
JOIN players p ON p.id = i.owner_id
WHERE p.name ILIKE '%SHARANGOVICH%'
ORDER BY i.created_at DESC;

-- 4. Проверяем запросы на подарки
SELECT 
    ir.id,
    ir.status,
    ir.item_type,
    ir.message,
    requester.name as requester_name,
    owner.name as star_name,
    ir.created_at
FROM item_requests ir
JOIN players requester ON requester.id = ir.requester_id
JOIN players owner ON owner.id = ir.owner_id
ORDER BY ir.created_at DESC
LIMIT 10;

-- 5. Проверяем музей Ivan Merkulov
SELECT 
    pm.id as museum_id,
    pm.player_id,
    p.name as player_name,
    pm.item_id,
    i.name as item_name,
    i.item_type,
    i.image_url,
    star.name as received_from_star,
    pm.received_at
FROM player_museum pm
JOIN players p ON p.id = pm.player_id
JOIN items i ON i.id = pm.item_id
JOIN players star ON star.id = pm.received_from
WHERE p.name ILIKE '%MERKULOV%'
ORDER BY pm.received_at DESC;

-- 6. Проверяем все предметы (для понимания структуры)
SELECT 
    i.id,
    i.name,
    i.item_type,
    i.image_url,
    i.is_available,
    p.name as owner_name,
    i.created_at
FROM items i
JOIN players p ON p.id = i.owner_id
ORDER BY i.created_at DESC
LIMIT 20;


