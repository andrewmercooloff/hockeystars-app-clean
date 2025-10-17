-- Создание таблицы для хранения очков активности пользователей
CREATE TABLE IF NOT EXISTS activity_points (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индекса для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_activity_points_user_id ON activity_points(user_id);

-- Создание уникального индекса для user_id (один пользователь = одна запись)
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_points_unique_user ON activity_points(user_id);

-- Создание таблицы для истории активности (опционально, для детального отслеживания)
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'exercise_complete', 'profile_update', etc.
    points_earned INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индекса для быстрого поиска по user_id в логе
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- Создание индекса для поиска по типу активности
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);

-- Включение RLS (Row Level Security)
ALTER TABLE activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Политики RLS для activity_points
-- Пользователи могут видеть только свои очки
CREATE POLICY "Users can view own activity points" ON activity_points
    FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут обновлять только свои очки
CREATE POLICY "Users can update own activity points" ON activity_points
    FOR UPDATE USING (auth.uid() = user_id);

-- Пользователи могут вставлять только свои очки
CREATE POLICY "Users can insert own activity points" ON activity_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политики RLS для activity_log
-- Пользователи могут видеть только свою историю активности
CREATE POLICY "Users can view own activity log" ON activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут вставлять только свои записи активности
CREATE POLICY "Users can insert own activity log" ON activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_activity_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_update_activity_points_updated_at
    BEFORE UPDATE ON activity_points
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_points_updated_at();
