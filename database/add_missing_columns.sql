-- Добавление недостающих колонок в таблицу players
-- Выполните этот скрипт в вашей базе данных Supabase

-- Добавляем колонку для любимых голов (видео)
ALTER TABLE players ADD COLUMN IF NOT EXISTS favorite_goals TEXT;

-- Добавляем колонку для фотографий (JSON массив)
ALTER TABLE players ADD COLUMN IF NOT EXISTS photos TEXT;

-- Добавляем колонку для номера игрока
ALTER TABLE players ADD COLUMN IF NOT EXISTS number VARCHAR(10);

-- Обновляем существующие записи, устанавливая пустые значения для новых колонок
UPDATE players SET 
  favorite_goals = '' WHERE favorite_goals IS NULL;

UPDATE players SET 
  photos = '[]' WHERE photos IS NULL;

UPDATE players SET 
  number = '' WHERE number IS NULL;

-- Добавляем комментарии к колонкам для документации
COMMENT ON COLUMN players.favorite_goals IS 'Ссылки на любимые голы (видео) в формате текста';
COMMENT ON COLUMN players.photos IS 'Массив фотографий в формате JSON';
COMMENT ON COLUMN players.number IS 'Номер игрока'; 