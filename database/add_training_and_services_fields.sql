-- Добавление полей для индивидуальных тренировок и услуг заточки коньков
-- Выполнить в Supabase SQL Editor

-- 1. Добавляем поле для индивидуальных тренировок тренеров
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS individual_training TEXT[] DEFAULT '{}';

-- 2. Добавляем поле для услуг заточки коньков
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS skate_services TEXT[] DEFAULT '{}';

-- 3. Добавляем комментарии к полям
COMMENT ON COLUMN players.individual_training IS 'Массив типов индивидуальных тренировок для тренеров';
COMMENT ON COLUMN players.skate_services IS 'Массив услуг для заточки коньков';

-- 4. Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_players_individual_training ON players USING GIN (individual_training);
CREATE INDEX IF NOT EXISTS idx_players_skate_services ON players USING GIN (skate_services);

-- 5. Обновляем RLS политики (если нужно)
-- Политики уже должны работать, так как мы используем существующую таблицу players

-- Проверяем, что поля добавлены
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('individual_training', 'skate_services')
ORDER BY column_name;

