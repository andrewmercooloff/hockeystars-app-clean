-- Исправление RLS политик для blocked_users
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can read their own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Authenticated users can block others" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock their own blocks" ON public.blocked_users;

-- Создаем новые политики (без auth.uid(), так как используется кастомная авторизация)
-- Политика для чтения (все могут читать - нужно для проверки блокировок)
CREATE POLICY "Anyone can read blocked users" ON public.blocked_users
FOR SELECT USING (true);

-- Политика для вставки (все могут блокировать - проверка на уровне приложения)
CREATE POLICY "Anyone can insert blocked users" ON public.blocked_users
FOR INSERT WITH CHECK (true);

-- Политика для удаления (все могут удалять - проверка на уровне приложения)
CREATE POLICY "Anyone can delete blocked users" ON public.blocked_users
FOR DELETE USING (true);

