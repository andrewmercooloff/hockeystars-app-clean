-- Добавление полей статистики для вратарей в таблицу players
-- Выполнить в Supabase SQL Editor

-- Добавляем поле minutes (количество проведенных минут)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS minutes INTEGER DEFAULT 0;

-- Добавляем поле shots (количество бросков)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS shots INTEGER DEFAULT 0;

-- Добавляем поле saves (отраженные броски / сэйвы)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0;

-- Комментарии к полям (опционально, для документации)
COMMENT ON COLUMN players.minutes IS 'Количество проведенных минут для вратарей';
COMMENT ON COLUMN players.shots IS 'Количество бросков по воротам для вратарей';
COMMENT ON COLUMN players.saves IS 'Количество отраженных бросков (сэйвы) для вратарей';

