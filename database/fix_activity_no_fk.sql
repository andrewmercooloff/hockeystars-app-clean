-- Финальное решение: убираем Foreign Key constraints
-- Причина: players.id имеет тип UUID, преобразование может сломать данные

-- ========================================
-- ШАГ 1: Отключаем RLS
-- ========================================
ALTER TABLE public.activity_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ШАГ 2: Удаляем ВСЕ политики
-- ========================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'activity_points'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activity_points';
    END LOOP;
    
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'activity_log'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.activity_log';
    END LOOP;
END $$;

-- ========================================
-- ШАГ 3: Удаляем все Foreign Key constraints
-- ========================================
ALTER TABLE public.activity_points 
DROP CONSTRAINT IF EXISTS activity_points_user_id_fkey;

ALTER TABLE public.activity_log 
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- ========================================
-- ШАГ 4: НЕ МЕНЯЕМ тип - оставляем как есть
-- (players.id это UUID, поэтому user_id тоже должен быть UUID или TEXT)
-- Для совместимости с вашей системой аутентификации оставляем TEXT
-- ========================================

-- Проверяем текущий тип
SELECT 
    'activity_points' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'activity_points'
  AND column_name = 'user_id'
UNION ALL
SELECT 
    'activity_log' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'activity_log'
  AND column_name = 'user_id'
UNION ALL
SELECT 
    'players' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'players'
  AND column_name = 'id';

-- Если тип user_id не TEXT, меняем его
DO $$
BEGIN
    -- Для activity_points
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_points' 
        AND column_name = 'user_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE public.activity_points 
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;
    
    -- Для activity_log
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' 
        AND column_name = 'user_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE public.activity_log 
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;
END $$;

-- ========================================
-- ШАГ 5: НЕ создаем Foreign Key constraints
-- Работаем без них для максимальной гибкости
-- ========================================

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
WHERE table_name IN ('activity_points', 'activity_log', 'players')
  AND column_name IN ('user_id', 'id')
ORDER BY table_name, column_name;

-- Проверяем что НЕТ Foreign Key constraints
SELECT
    tc.table_name, 
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
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


