-- Добавляем поле is_admin_gift в таблицу items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_admin_gift BOOLEAN DEFAULT FALSE;

-- Добавляем комментарий к колонке
COMMENT ON COLUMN items.is_admin_gift IS 'Флаг, указывающий что подарок отправлен администратором';

-- Создаем индекс для быстрого поиска административных подарков
CREATE INDEX IF NOT EXISTS idx_items_is_admin_gift ON items(is_admin_gift);

-- Проверяем, что колонка добавлена
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'items' AND column_name = 'is_admin_gift';