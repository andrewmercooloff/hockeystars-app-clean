-- Создание таблицы exercises для хранения упражнений с поддержкой многоязычности
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем таблицу exercises
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  exercise_id VARCHAR(10) UNIQUE NOT NULL, -- ID упражнения (1, 2, 3, etc.)
  
  -- Основные поля (не зависят от языка)
  category VARCHAR(100) NOT NULL, -- Категория упражнения
  duration VARCHAR(20) NOT NULL, -- Продолжительность
  difficulty VARCHAR(20) NOT NULL, -- Сложность
  image_url TEXT, -- URL изображения
  
  -- Русские переводы
  title_ru VARCHAR(255) NOT NULL,
  description_ru TEXT NOT NULL,
  benefits_ru JSONB DEFAULT '[]'::jsonb, -- Массив пользы
  instructions_ru JSONB DEFAULT '[]'::jsonb, -- Массив инструкций
  tips_ru JSONB DEFAULT '[]'::jsonb, -- Массив советов
  equipment_ru TEXT,
  calories_ru VARCHAR(100),
  
  -- Английские переводы
  title_en VARCHAR(255) NOT NULL,
  description_en TEXT NOT NULL,
  benefits_en JSONB DEFAULT '[]'::jsonb, -- Массив пользы
  instructions_en JSONB DEFAULT '[]'::jsonb, -- Массив инструкций
  tips_en JSONB DEFAULT '[]'::jsonb, -- Массив советов
  equipment_en TEXT,
  calories_en VARCHAR(100),
  
  -- Метаданные
  is_active BOOLEAN DEFAULT true, -- Активно ли упражнение
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_exercises_exercise_id ON exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_title_ru ON exercises USING GIN (to_tsvector('russian', title_ru));
CREATE INDEX IF NOT EXISTS idx_exercises_title_en ON exercises USING GIN (to_tsvector('english', title_en));

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

-- Включаем RLS (Row Level Security)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
-- Все пользователи могут читать активные упражнения
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT USING (is_active = true);

-- Только аутентифицированные пользователи могут читать все упражнения
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- Только пользователи с ролью admin могут изменять упражнения
CREATE POLICY "Only admins can modify exercises" ON exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

-- Добавляем комментарии к таблице и колонкам
COMMENT ON TABLE exercises IS 'Таблица упражнений с поддержкой многоязычности';
COMMENT ON COLUMN exercises.exercise_id IS 'Уникальный ID упражнения (1, 2, 3, etc.)';
COMMENT ON COLUMN exercises.category IS 'Категория упражнения (не зависит от языка)';
COMMENT ON COLUMN exercises.duration IS 'Продолжительность упражнения';
COMMENT ON COLUMN exercises.difficulty IS 'Уровень сложности';
COMMENT ON COLUMN exercises.title_ru IS 'Название упражнения на русском';
COMMENT ON COLUMN exercises.title_en IS 'Название упражнения на английском';
COMMENT ON COLUMN exercises.benefits_ru IS 'Польза упражнения на русском (JSON массив)';
COMMENT ON COLUMN exercises.benefits_en IS 'Польза упражнения на английском (JSON массив)';
COMMENT ON COLUMN exercises.instructions_ru IS 'Инструкции на русском (JSON массив)';
COMMENT ON COLUMN exercises.instructions_en IS 'Инструкции на английском (JSON массив)';
COMMENT ON COLUMN exercises.tips_ru IS 'Советы на русском (JSON массив)';
COMMENT ON COLUMN exercises.tips_en IS 'Советы на английском (JSON массив)';
COMMENT ON COLUMN exercises.is_active IS 'Активно ли упражнение для отображения';

-- Проверяем, что таблица создана
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'exercises' 
AND table_schema = 'public'
ORDER BY ordinal_position;

































