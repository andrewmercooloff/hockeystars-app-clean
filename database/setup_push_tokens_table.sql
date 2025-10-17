-- Создание таблицы для хранения push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(token, user_id)
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Добавление комментариев
COMMENT ON TABLE push_tokens IS 'Таблица для хранения push tokens пользователей';
COMMENT ON COLUMN push_tokens.token IS 'Expo push token';
COMMENT ON COLUMN push_tokens.user_id IS 'ID пользователя';
COMMENT ON COLUMN push_tokens.device_id IS 'ID устройства';
COMMENT ON COLUMN push_tokens.platform IS 'Платформа (ios/android)';











