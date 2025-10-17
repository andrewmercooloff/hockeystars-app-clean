-- ====================================
-- Система рейтинга активности
-- ====================================
-- Этот скрипт создает таблицы и политики RLS для системы рейтинга активности
-- Выполните его в Supabase Dashboard -> SQL Editor

-- 1. Создание таблицы activity_points (если не существует)
CREATE TABLE IF NOT EXISTS public.activity_points (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Создание таблицы activity_log (если не существует)
CREATE TABLE IF NOT EXISTS public.activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_activity_points_user_id ON public.activity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_points_points ON public.activity_points(points DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON public.activity_log(activity_type);

-- 4. Удаление существующих политик RLS (если есть)
DROP POLICY IF EXISTS "Users can view their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can insert their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can update their own activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Admins can view all activity points" ON public.activity_points;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_log;

-- 5. Включение RLS для обеих таблиц
ALTER TABLE public.activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 6. Создание политик RLS для activity_points
-- Пользователи могут просматривать свои очки
CREATE POLICY "Users can view their own activity points" 
ON public.activity_points
FOR SELECT 
USING (auth.uid() = user_id);

-- Пользователи могут вставлять свои очки
CREATE POLICY "Users can insert their own activity points" 
ON public.activity_points
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять свои очки
CREATE POLICY "Users can update their own activity points" 
ON public.activity_points
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Администраторы могут просматривать все очки
CREATE POLICY "Admins can view all activity points" 
ON public.activity_points
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.players 
        WHERE players.id::text = auth.uid()::text 
        AND players.status = 'admin'
    )
);

-- 7. Создание политик RLS для activity_log
-- Пользователи могут просматривать свои логи
CREATE POLICY "Users can view their own activity logs" 
ON public.activity_log
FOR SELECT 
USING (auth.uid() = user_id);

-- Пользователи могут вставлять свои логи
CREATE POLICY "Users can insert their own activity logs" 
ON public.activity_log
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Администраторы могут просматривать все логи
CREATE POLICY "Admins can view all activity logs" 
ON public.activity_log
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.players 
        WHERE players.id::text = auth.uid()::text 
        AND players.status = 'admin'
    )
);

-- 8. Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_activity_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Создание триггера для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_activity_points_updated_at ON public.activity_points;
CREATE TRIGGER trigger_update_activity_points_updated_at
    BEFORE UPDATE ON public.activity_points
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_points_updated_at();

-- 10. Проверка созданных политик
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('activity_points', 'activity_log')
ORDER BY tablename, policyname;

-- Готово! Система рейтинга активности настроена.
