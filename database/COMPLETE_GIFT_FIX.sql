-- ПОЛНОЕ ИСПРАВЛЕНИЕ СИСТЕМЫ ПОДАРКОВ
-- Выполните этот скрипт ЦЕЛИКОМ в Supabase Dashboard → SQL Editor

-- ШАГ 1: Удаляем старые некорректные подарки без изображения
DELETE FROM player_museum
WHERE id IN (
    SELECT pm.id
    FROM player_museum pm
    JOIN items i ON i.id = pm.item_id
    JOIN players p ON p.id = pm.player_id
    WHERE p.name ILIKE '%IVAN%MERKULOV%'
      AND i.image_url IS NULL
);

DELETE FROM items
WHERE id IN (
    SELECT i.id
    FROM items i
    JOIN players p ON p.id = i.owner_id
    WHERE p.name ILIKE '%IVAN%MERKULOV%'
      AND i.image_url IS NULL
);

-- ШАГ 2: Исправляем RLS политики для items
DROP POLICY IF EXISTS "Players can insert own items" ON items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON items;
DROP POLICY IF EXISTS "Players can update own items" ON items;
DROP POLICY IF EXISTS "Authenticated users can update items" ON items;

CREATE POLICY "Authenticated users can insert items" ON items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update items" ON items
  FOR UPDATE USING (true);

-- ШАГ 3: Исправляем RLS политики для player_museum
DROP POLICY IF EXISTS "Players can insert museum items" ON player_museum;
DROP POLICY IF EXISTS "Authenticated users can insert museum items" ON player_museum;

CREATE POLICY "Authenticated users can insert museum items" ON player_museum
  FOR INSERT WITH CHECK (true);

-- ШАГ 4: Проверяем результат
-- Смотрим подарки Egor Sharangovich (должны быть с изображениями)
SELECT 
    'Подарки EGOR SHARANGOVICH' as section,
    i.id,
    i.name,
    i.item_type,
    CASE WHEN i.image_url IS NOT NULL THEN '✅ Есть' ELSE '❌ Нет' END as has_image,
    i.is_available
FROM items i
JOIN players p ON p.id = i.owner_id
WHERE p.name ILIKE '%SHARANGOVICH%'
ORDER BY i.created_at DESC;

-- Смотрим музей Ivan Merkulov (должен быть пуст или только с корректными подарками)
SELECT 
    'Музей IVAN MERKULOV' as section,
    pm.id as museum_id,
    i.name as item_name,
    CASE WHEN i.image_url IS NOT NULL THEN '✅ Есть' ELSE '❌ Нет' END as has_image,
    star.name as from_star
FROM player_museum pm
JOIN items i ON i.id = pm.item_id
JOIN players p ON p.id = pm.player_id
JOIN players star ON star.id = pm.received_from
WHERE p.name ILIKE '%IVAN%MERKULOV%'
ORDER BY pm.received_at DESC;

-- Проверяем политики items
SELECT 
    'RLS Policies: items' as section,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'items'
ORDER BY policyname;

-- Проверяем политики player_museum
SELECT 
    'RLS Policies: player_museum' as section,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'player_museum'
ORDER BY policyname;


