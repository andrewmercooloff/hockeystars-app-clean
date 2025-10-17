-- Добавление поля для хранения годов рождения, которые тренирует тренер

-- Добавляем новое поле coach_years (массив целых чисел)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS coach_years INTEGER[];

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.players.coach_years IS 'Годы рождения игроков, которых тренирует этот тренер (только для status=coach)';

-- Создаем индекс для быстрого поиска тренеров по годам
CREATE INDEX IF NOT EXISTS idx_players_coach_years 
ON public.players USING GIN (coach_years);

-- Проверяем результат
SELECT 
    id, 
    name, 
    status, 
    coach_years 
FROM public.players 
WHERE status = 'coach'
LIMIT 5;



