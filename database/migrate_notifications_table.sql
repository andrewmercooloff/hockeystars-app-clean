-- Миграция таблицы notifications для исправления структуры
-- Переименовываем колонки для соответствия коду

-- Переименовываем playerId в user_id
ALTER TABLE notifications RENAME COLUMN playerId TO user_id;

-- Переименовываем isRead в is_read
ALTER TABLE notifications RENAME COLUMN isRead TO is_read;

-- Переименовываем индекс
DROP INDEX IF EXISTS idx_notifications_player_id;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
