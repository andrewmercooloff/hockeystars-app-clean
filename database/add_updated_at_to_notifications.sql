-- Добавляем поле updated_at в таблицу notifications
-- Это поле будет автоматически обновляться при изменении записи

-- Добавляем колонку updated_at с автоматическим обновлением
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Обновляем существующие записи, устанавливая updated_at = created_at
UPDATE notifications 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Добавляем комментарий к таблице
COMMENT ON TABLE notifications IS 'Таблица уведомлений с автоматическим обновлением updated_at';
COMMENT ON COLUMN notifications.updated_at IS 'Время последнего обновления записи (автоматически обновляется)';
