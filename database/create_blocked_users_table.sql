-- Создание таблицы заблокированных пользователей
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Создание таблицы blocked_users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

-- 2. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_pair ON public.blocked_users(blocker_id, blocked_id);

-- 3. Включение Row Level Security (RLS)
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем старые политики, если они существуют (на случай, если таблица уже была создана)
DROP POLICY IF EXISTS "Users can read their own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Authenticated users can block others" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock their own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Anyone can read blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Anyone can insert blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Anyone can delete blocked users" ON public.blocked_users;

-- 5. Политика для чтения (все могут читать - нужно для проверки блокировок)
CREATE POLICY "Anyone can read blocked users" ON public.blocked_users
FOR SELECT USING (true);

-- 6. Политика для вставки (все могут блокировать - проверка на уровне приложения)
CREATE POLICY "Anyone can insert blocked users" ON public.blocked_users
FOR INSERT WITH CHECK (true);

-- 7. Политика для удаления (все могут удалять - проверка на уровне приложения)
CREATE POLICY "Anyone can delete blocked users" ON public.blocked_users
FOR DELETE USING (true);

-- 8. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_blocked_users_updated_at ON public.blocked_users;
CREATE TRIGGER update_blocked_users_updated_at
  BEFORE UPDATE ON public.blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

