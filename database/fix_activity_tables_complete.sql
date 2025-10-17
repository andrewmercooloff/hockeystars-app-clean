-- Полное исправление таблиц активности
-- Удаляем политики, меняем тип, создаем заново

-- ========================================
-- ШАГ 1: Удаляем все политики
-- ========================================
DROP POLICY IF EXISTS "Users can view their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can insert their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can update their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Admins can view all activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for authenticated users - select" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for authenticated users - insert" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for authenticated users - update" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for authenticated users - delete" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for anon - select points" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for anon - insert points" ON public.activity_points;
DROP POLICY IF EXISTS "Allow all for anon - update points" ON public.activity_points;

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all for authenticated users - select" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all for authenticated users - insert" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all for authenticated users - delete" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all for anon - select log" ON public.activity_log;
DROP POLICY IF EXISTS "Allow all for anon - insert log" ON public.activity_log;

-- ========================================
-- ШАГ 2: Удаляем Foreign Key constraints
-- ========================================
ALTER TABLE public.activity_points 
DROP CONSTRAINT IF EXISTS activity_points_user_id_fkey;

ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- ========================================
-- ШАГ 3: Меняем тип user_id на TEXT
-- ========================================
ALTER TABLE public.activity_points 
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.activity_log 
ALTER COLUMN user_id TYPE TEXT;

-- ========================================
-- ШАГ 4: Добавляем Foreign Key на players
-- ========================================
ALTER TABLE public.activity_points 
ADD CONSTRAINT activity_points_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.activity_log 
ADD CONSTRAINT activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- ========================================
-- ШАГ 5: Создаем новые политики
-- ========================================

-- Политики для activity_points
CREATE POLICY "Allow all for authenticated users - select" 
ON public.activity_points
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow all for authenticated users - insert" 
ON public.activity_points
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users - update" 
ON public.activity_points
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for anon - select points" 
ON public.activity_points
FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Allow all for anon - insert points" 
ON public.activity_points
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Allow all for anon - update points" 
ON public.activity_points
FOR UPDATE 
TO anon
USING (true)
WITH CHECK (true);

-- Политики для activity_log
CREATE POLICY "Allow all for authenticated users - select" 
ON public.activity_log
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow all for authenticated users - insert" 
ON public.activity_log
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all for anon - select log" 
ON public.activity_log
FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Allow all for anon - insert log" 
ON public.activity_log
FOR INSERT 
TO anon
WITH CHECK (true);

-- ========================================
-- ШАГ 6: Убеждаемся, что RLS включен
-- ========================================
ALTER TABLE public.activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ШАГ 7: Проверка результатов
-- ========================================

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
    roles, 
    cmd
FROM pg_policies 
WHERE tablename IN ('activity_points', 'activity_log')
ORDER BY tablename, policyname;


