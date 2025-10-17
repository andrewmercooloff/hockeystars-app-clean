-- Добавление новых полей в таблицу players
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Проверяем, существуют ли уже поля
DO $$
BEGIN
    -- Добавляем поле для прошлых команд (JSON массив)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'past_teams') THEN
        ALTER TABLE public.players ADD COLUMN past_teams JSONB DEFAULT '[]'::jsonb;
    ELSE
        -- Если поле существует как TEXT, конвертируем в JSONB
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'past_teams' 
                   AND data_type = 'text') THEN
            ALTER TABLE public.players ALTER COLUMN past_teams TYPE JSONB USING '[]'::jsonb;
            ALTER TABLE public.players ALTER COLUMN past_teams SET DEFAULT '[]'::jsonb;
        END IF;
    END IF;

    -- Добавляем поле для достижений (JSON массив)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'achievements') THEN
        ALTER TABLE public.players ADD COLUMN achievements JSONB DEFAULT '[]'::jsonb;
    ELSE
        -- Если поле существует как TEXT, конвертируем в JSONB
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'achievements' 
                   AND data_type = 'text') THEN
            ALTER TABLE public.players ALTER COLUMN achievements TYPE JSONB USING '[]'::jsonb;
            ALTER TABLE public.players ALTER COLUMN achievements SET DEFAULT '[]'::jsonb;
        END IF;
    END IF;

    -- Добавляем поле для фотографий (JSON массив)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'photos') THEN
        ALTER TABLE public.players ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
    ELSE
        -- Если поле существует как TEXT, конвертируем в JSONB
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'players' AND column_name = 'photos' 
                   AND data_type = 'text') THEN
            ALTER TABLE public.players ALTER COLUMN photos TYPE JSONB USING '[]'::jsonb;
            ALTER TABLE public.players ALTER COLUMN photos SET DEFAULT '[]'::jsonb;
        END IF;
    END IF;
END $$;

-- Создаем индексы для новых полей (если они еще не существуют)
DROP INDEX IF EXISTS idx_players_past_teams;
CREATE INDEX idx_players_past_teams ON public.players USING GIN (past_teams);

DROP INDEX IF EXISTS idx_players_achievements;
CREATE INDEX idx_players_achievements ON public.players USING GIN (achievements);

DROP INDEX IF EXISTS idx_players_photos;
CREATE INDEX idx_players_photos ON public.players USING GIN (photos);

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position; 