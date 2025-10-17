-- Исправление RLS политик для системы рейтинга активности
-- Проблема: auth.uid() не совпадает с user_id в таблицах

-- 1. Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can insert their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can update their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Admins can view all activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_log;

-- 2. Создаем новые упрощенные политики
-- Все аутентифицированные пользователи могут работать с любыми данными
-- (временное решение, пока не разберемся с auth.uid())

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

CREATE POLICY "Allow all for authenticated users - delete" 
ON public.activity_points
FOR DELETE 
TO authenticated
USING (true);

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

CREATE POLICY "Allow all for authenticated users - delete" 
ON public.activity_log
FOR DELETE 
TO authenticated
USING (true);

-- Дополнительно: разрешаем доступ для anon (если используется service key)
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

-- 3. Убеждаемся, что RLS включен
ALTER TABLE public.activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 4. Проверяем созданные политики
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename IN ('activity_points', 'activity_log')
ORDER BY tablename, policyname;


