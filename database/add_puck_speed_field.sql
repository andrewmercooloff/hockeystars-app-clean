-- Добавляем поле для хранения данных скорости шайбы
-- Данные хранятся в формате JSON: { maxSpeed: number, history: Array<{speed: number, date: string}> }

-- Проверяем, существует ли уже поле puck_speed_data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'puck_speed_data'
    ) THEN
        -- Добавляем поле puck_speed_data
        ALTER TABLE players 
        ADD COLUMN puck_speed_data TEXT;
        
        RAISE NOTICE 'Поле puck_speed_data успешно добавлено в таблицу players';
    ELSE
        RAISE NOTICE 'Поле puck_speed_data уже существует в таблице players';
    END IF;
END $$;

-- Создаем индекс для быстрого поиска игроков с измеренной скоростью
CREATE INDEX IF NOT EXISTS idx_players_puck_speed 
ON players ((puck_speed_data IS NOT NULL)) 
WHERE puck_speed_data IS NOT NULL;

-- Комментарий к полю
COMMENT ON COLUMN players.puck_speed_data IS 'JSON данные скорости шайбы: { maxSpeed: number (км/ч), history: Array<{speed: number, date: string}> }';

