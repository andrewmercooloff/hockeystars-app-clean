-- Добавляем колонку для статистики упражнений
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS exercise_stats JSONB DEFAULT '{"completions":[],"totalCompletions":0}';

-- Добавляем комментарий к колонке
COMMENT ON COLUMN players.exercise_stats IS 'JSON статистика выполненных упражнений игрока';

-- Создаем индекс для быстрого поиска по статистике упражнений
CREATE INDEX IF NOT EXISTS idx_players_exercise_stats ON players USING GIN (exercise_stats);

-- Проверяем, что колонка добавлена
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'exercise_stats';



