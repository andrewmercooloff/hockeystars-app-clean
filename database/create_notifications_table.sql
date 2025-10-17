-- Создаем таблицу уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индекс для быстрого поиска по игроку
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Создаем индекс для быстрого поиска по типу
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Создаем индекс для быстрого поиска по времени
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
