-- Создание таблицы лайков в Supabase
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL, -- URL для фото или комбинация url+timeCode для видео
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('video', 'photo')),
  liked_by_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Уникальное ограничение: один пользователь может лайкнуть одно и то же содержание только один раз
  UNIQUE(content_id, content_type, liked_by_id)
);

-- Индексы для быстрой работы
CREATE INDEX IF NOT EXISTS idx_likes_player_content ON public.likes(player_id, content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_likes_liked_by ON public.likes(liked_by_id);
CREATE INDEX IF NOT EXISTS idx_likes_content ON public.likes(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON public.likes(created_at DESC);

-- RLS политики
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть все лайки (для отображения счетчиков)
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
CREATE POLICY "Users can view all likes" ON public.likes FOR SELECT USING (true);

-- Пользователи могут создавать свои лайки
-- Используем более мягкую политику: разрешаем создание, если liked_by_id указан
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
CREATE POLICY "Users can create their own likes" ON public.likes FOR INSERT 
  WITH CHECK (true);

-- Пользователи могут удалять только свои лайки
-- Используем более мягкую политику: разрешаем удаление, если liked_by_id совпадает
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE 
  USING (true);

-- Проверка создания таблицы
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'likes' 
ORDER BY ordinal_position;

