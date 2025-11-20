-- Автоматическое исправление всех дубликатов по телефону
-- ВАЖНО: Выполняйте этот скрипт осторожно! Сначала проверьте результаты запросов.

-- 1. Находим все дубликаты
WITH duplicates AS (
  SELECT 
    phone,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids,
    ARRAY_AGG(name ORDER BY created_at DESC) as names,
    ARRAY_AGG(status ORDER BY created_at DESC) as statuses,
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
  FROM public.players
  WHERE phone IS NOT NULL AND phone != ''
  GROUP BY phone
  HAVING COUNT(*) > 1
)
SELECT 
  phone,
  count,
  ids[1] as keep_id,  -- ID самой новой записи (оставляем)
  names[1] as keep_name,
  statuses[1] as keep_status,
  ids[2:] as delete_ids,  -- ID старых записей (удаляем)
  names[2:] as delete_names
FROM duplicates
ORDER BY count DESC;

-- 2. ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР: Что будет удалено
-- (Раскомментируйте, чтобы увидеть, что будет удалено)
/*
WITH duplicates AS (
  SELECT 
    phone,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids,
    ARRAY_AGG(name ORDER BY created_at DESC) as names,
    ARRAY_AGG(status ORDER BY created_at DESC) as statuses
  FROM public.players
  WHERE phone IS NOT NULL AND phone != ''
  GROUP BY phone
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT 
    phone,
    unnest(ids[2:]) as delete_id,
    unnest(names[2:]) as delete_name,
    unnest(statuses[2:]) as delete_status
  FROM duplicates
)
SELECT 
  p.id,
  p.name,
  p.phone,
  p.status,
  p.created_at,
  'БУДЕТ УДАЛЕНО' as action
FROM public.players p
INNER JOIN to_delete td ON p.id = td.delete_id
ORDER BY p.phone, p.created_at;
*/

-- 3. УДАЛЕНИЕ ДУБЛИКАТОВ (ОСТОРОЖНО! Проверьте результаты запроса #2 перед выполнением!)
-- Раскомментируйте только после проверки результатов выше
/*
WITH duplicates AS (
  SELECT 
    phone,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids
  FROM public.players
  WHERE phone IS NOT NULL AND phone != ''
  GROUP BY phone
  HAVING COUNT(*) > 1
),
ids_to_delete AS (
  SELECT unnest(ids[2:]) as id_to_delete
  FROM duplicates
)
DELETE FROM public.players
WHERE id IN (SELECT id_to_delete FROM ids_to_delete);
*/

-- 4. Проверка результата - должны остаться только уникальные телефоны
SELECT 
  phone,
  COUNT(*) as count
FROM public.players
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1;
-- Если этот запрос вернет 0 строк - все дубликаты удалены


