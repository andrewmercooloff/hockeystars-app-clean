-- Исправление Foreign Key constraints для таблиц активности
-- Проблема: таблицы ссылаются на auth.users, но пользователи в таблице players

-- 1. Удаляем существующие Foreign Key constraints
ALTER TABLE public.activity_points 
DROP CONSTRAINT IF EXISTS activity_points_user_id_fkey;

ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- 2. Меняем тип user_id на TEXT (чтобы совпадал с players.id)
ALTER TABLE public.activity_points 
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.activity_log 
ALTER COLUMN user_id TYPE TEXT;

-- 3. Добавляем новые Foreign Key constraints, которые ссылаются на players
ALTER TABLE public.activity_points 
ADD CONSTRAINT activity_points_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- 4. Проверяем constraints
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('activity_points', 'activity_log')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;


