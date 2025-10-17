-- Исправление constraint в таблице push_tokens
-- Проблема: constraint на user_id не позволяет иметь несколько устройств у одного пользователя
-- Решение: изменить constraint на комбинацию (token, user_id)

-- Удаляем старый constraint на user_id
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_key;

-- Удаляем старый constraint на (token, user_id) если есть
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_token_user_id_key;

-- Создаем новый правильный constraint на (token, user_id)
-- Это позволяет одному пользователю иметь несколько токенов (разные устройства)
-- Но не позволяет дублировать один и тот же токен для одного пользователя
ALTER TABLE push_tokens 
ADD CONSTRAINT push_tokens_token_user_id_key UNIQUE (token, user_id);

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON push_tokens(device_id);

-- Добавляем комментарии
COMMENT ON CONSTRAINT push_tokens_token_user_id_key ON push_tokens IS 'Уникальная комбинация токена и пользователя (один токен на одного пользователя)';











