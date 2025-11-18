-- Добавление колонки is_hidden в таблицу players
-- Эта колонка используется для скрытия профилей администратором

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Создаем индекс для быстрого поиска скрытых профилей
CREATE INDEX IF NOT EXISTS idx_players_is_hidden ON players(is_hidden);

-- Добавляем комментарий
COMMENT ON COLUMN players.is_hidden IS 'Флаг скрытия профиля администратором. Скрытые профили не видны другим пользователям.';



