-- Добавляем колонки для продолжительности на разных языках
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS duration_ru VARCHAR(20);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS duration_en VARCHAR(20);

-- Копируем существующие значения в русскую колонку
UPDATE exercises SET duration_ru = duration WHERE duration_ru IS NULL;

-- Заполняем английские переводы для существующих упражнений
UPDATE exercises SET duration_en = '20-30 min' WHERE duration_ru = '20-30 мин';
UPDATE exercises SET duration_en = '15-20 min' WHERE duration_ru = '15-20 мин';
UPDATE exercises SET duration_en = '25-30 min' WHERE duration_ru = '25-30 мин';
UPDATE exercises SET duration_en = '12-15 min' WHERE duration_ru = '12-15 мин';
UPDATE exercises SET duration_en = '10-15 min' WHERE duration_ru = '10-15 мин';
UPDATE exercises SET duration_en = '8-10 min' WHERE duration_ru = '8-10 мин';
UPDATE exercises SET duration_en = '10-12 min' WHERE duration_ru = '10-12 мин';

-- Для остальных упражнений (если есть другие значения)
UPDATE exercises SET duration_en = REPLACE(duration_ru, 'мин', 'min') WHERE duration_en IS NULL;





















