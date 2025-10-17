-- Простой скрипт для добавления новых полей в таблицу players
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Удаляем поля, если они существуют (чтобы избежать конфликтов)
ALTER TABLE public.players DROP COLUMN IF EXISTS past_teams;
ALTER TABLE public.players DROP COLUMN IF EXISTS achievements;
ALTER TABLE public.players DROP COLUMN IF EXISTS photos;

-- Добавляем новые поля как JSONB
ALTER TABLE public.players ADD COLUMN past_teams JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.players ADD COLUMN achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.players ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;

-- Создаем индексы
CREATE INDEX idx_players_past_teams ON public.players USING GIN (past_teams);
CREATE INDEX idx_players_achievements ON public.players USING GIN (achievements);
CREATE INDEX idx_players_photos ON public.players USING GIN (photos);

-- Проверяем результат
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name IN ('past_teams', 'achievements', 'photos')
ORDER BY column_name; 