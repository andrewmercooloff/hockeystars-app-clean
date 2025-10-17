-- Финальное исправление - удаляем ВСЕ политики и пересоздаем таблицы

-- ========================================
-- ШАГ 1: Отключаем RLS
-- ========================================
ALTER TABLE public.activity_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ШАГ 2: Удаляем ВСЕ политики (через pg_policies)
-- ========================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Удаляем все политики для activity_points
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'activity_points'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activity_points';
    END LOOP;
    
    -- Удаляем все политики для activity_log
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'activity_log'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activity_log';
    END LOOP;
END $$;

-- ========================================
-- ШАГ 3: Удаляем Foreign Key constraints
-- ========================================
ALTER TABLE public.activity_points 
DROP CONSTRAINT IF EXISTS activity_points_user_id_fkey;

ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- ========================================
-- ШАГ 4: Меняем тип user_id на TEXT
-- ========================================
ALTER TABLE public.activity_points 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.activity_log 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ========================================
-- ШАГ 5: Добавляем Foreign Key на players
-- ========================================
ALTER TABLE public.activity_points 
ADD CONSTRAINT activity_points_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- ========================================
-- ШАГ 6: Создаем простые политики
-- ========================================

-- Политики для activity_points
CREATE POLICY "allow_all_select_points" 
ON public.activity_points
FOR SELECT 
USING (true);

CREATE POLICY "allow_all_insert_points" 
ON public.activity_points
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "allow_all_update_points" 
ON public.activity_points
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_delete_points" 
ON public.activity_points
FOR DELETE 
USING (true);

-- Политики для activity_log
CREATE POLICY "allow_all_select_log" 
ON public.activity_log
FOR SELECT 
USING (true);

CREATE POLICY "allow_all_insert_log" 
ON public.activity_log
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "allow_all_delete_log" 
ON public.activity_log
FOR DELETE 
USING (true);

-- ========================================
-- ШАГ 7: Включаем RLS обратно
-- ========================================
ALTER TABLE public.activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ШАГ 8: Проверка результатов
-- ========================================

-- Проверяем типы колонок
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('activity_points', 'activity_log')
  AND column_name = 'user_id';

-- Проверяем Foreign Key constraints
SELECT
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('activity_points', 'activity_log')
  AND tc.constraint_type = 'FOREIGN KEY';

-- Проверяем политики
SELECT 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename IN ('activity_points', 'activity_log')
ORDER BY tablename, policyname;


