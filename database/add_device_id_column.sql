-- Добавление колонки device_id в существующую таблицу push_tokens
ALTER TABLE push_tokens 
ADD COLUMN IF NOT EXISTS device_id TEXT NOT NULL DEFAULT 'unknown';

-- Обновляем существующие записи, если есть
UPDATE push_tokens 
SET device_id = CONCAT(platform, '-', EXTRACT(EPOCH FROM created_at)::TEXT)
WHERE device_id = 'unknown';

-- Создаем индекс для device_id, если его нет
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON push_tokens(device_id);

-- Добавляем комментарий
COMMENT ON COLUMN push_tokens.device_id IS 'ID устройства';












