-- Добавление столбца unreadNotificationsCount в таблицу players
ALTER TABLE players
ADD COLUMN unread_notifications_count INTEGER DEFAULT 0;




