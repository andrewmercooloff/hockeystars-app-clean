-- Обновление системы подарков для поддержки множественного использования
-- Убираем ограничение is_available и добавляем поддержку кастомных названий

-- Удаляем колонку is_available из таблицы items
ALTER TABLE items DROP COLUMN IF EXISTS is_available;

-- Добавляем колонку для кастомного названия подарка в музее
ALTER TABLE player_museum ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

-- Добавляем колонку для отслеживания статуса запроса после отправки подарка
ALTER TABLE item_requests ADD COLUMN IF NOT EXISTS gift_sent_at TIMESTAMP WITH TIME ZONE;

-- Обновляем индексы
DROP INDEX IF EXISTS idx_items_available;
CREATE INDEX IF NOT EXISTS idx_player_museum_custom_name ON player_museum(custom_name);
CREATE INDEX IF NOT EXISTS idx_item_requests_gift_sent ON item_requests(gift_sent_at);

-- Комментарии для понимания новой структуры
COMMENT ON COLUMN player_museum.custom_name IS 'Кастомное название подарка, заданное отправителем';
COMMENT ON COLUMN item_requests.gift_sent_at IS 'Время отправки подарка (запрос считается выполненным)';


