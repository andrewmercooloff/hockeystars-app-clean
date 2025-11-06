-- Добавление полей для отслеживания онлайн-офлайн статуса пользователей
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем поле is_online (boolean) для статуса онлайн
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'players' 
        AND column_name = 'is_online'
    ) THEN
        ALTER TABLE players 
        ADD COLUMN is_online BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Поле is_online успешно добавлено в таблицу players';
    ELSE
        RAISE NOTICE 'Поле is_online уже существует в таблице players';
    END IF;
END $$;

-- 2. Добавляем поле last_seen (timestamp) для отслеживания последней активности
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'players' 
        AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE players 
        ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Поле last_seen успешно добавлено в таблицу players';
    ELSE
        RAISE NOTICE 'Поле last_seen уже существует в таблице players';
    END IF;
END $$;

-- 3. Инициализируем значения для существующих пользователей
UPDATE players 
SET 
    is_online = false,
    last_seen = COALESCE(updated_at, created_at, NOW())
WHERE is_online IS NULL OR last_seen IS NULL;

-- 4. Добавляем комментарии к полям
COMMENT ON COLUMN players.is_online IS 'Статус онлайн пользователя (true = онлайн, false = офлайн)';
COMMENT ON COLUMN players.last_seen IS 'Время последней активности пользователя';

-- 5. Создаем индекс для быстрого поиска онлайн пользователей
CREATE INDEX IF NOT EXISTS idx_players_is_online ON players(is_online) WHERE is_online = true;

-- 6. Создаем индекс для сортировки по последней активности
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen DESC);

-- 7. Сообщение об успешном завершении
DO $$
BEGIN
    RAISE NOTICE '✅ Поля is_online и last_seen успешно добавлены в таблицу players';
END $$;

