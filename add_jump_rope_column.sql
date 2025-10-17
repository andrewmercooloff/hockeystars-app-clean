-- Добавление колонки jump_rope в таблицу players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS jump_rope INTEGER DEFAULT 0;

-- Комментарий к колонке
COMMENT ON COLUMN players.jump_rope IS 'Количество прыжков на скакалке';

-- Проверка структуры таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('pull_ups', 'push_ups', 'plank_time', 'sprint_100m', 'long_jump', 'jump_rope')
ORDER BY column_name;
