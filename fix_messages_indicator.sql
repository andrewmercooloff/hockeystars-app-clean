-- ============================================
-- ИСПРАВЛЕНИЕ СИСТЕМЫ ИНДИКАТОРА СООБЩЕНИЙ
-- ============================================

-- 1. Добавляем поле unread_messages_count, если его еще нет
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS unread_messages_count INTEGER DEFAULT 0;

-- 2. Инициализируем значения для существующих пользователей
UPDATE players 
SET unread_messages_count = 0 
WHERE unread_messages_count IS NULL;

-- 3. Создаем функцию для увеличения счетчика сообщений
CREATE OR REPLACE FUNCTION increment_unread_messages(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_messages_count = COALESCE(unread_messages_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем функцию для обнуления счетчика сообщений
CREATE OR REPLACE FUNCTION reset_unread_messages(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_messages_count = 0
  WHERE id = user_id;
  
  RAISE NOTICE 'Счетчик сообщений обнулен для пользователя %', user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем функцию для обновления счетчика сообщений при отправке
CREATE OR REPLACE FUNCTION update_messages_count_on_send()
RETURNS TRIGGER AS $$
BEGIN
  -- Увеличиваем счетчик для получателя
  PERFORM increment_unread_messages(NEW.receiver_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем триггер для автоматического обновления счетчика при отправке сообщения
DROP TRIGGER IF EXISTS messages_count_on_send ON messages;
CREATE TRIGGER messages_count_on_send
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_count_on_send();

-- 7. Создаем функцию для обновления счетчика при чтении сообщений
CREATE OR REPLACE FUNCTION update_messages_count_on_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Если сообщение было отмечено как прочитанное
  IF OLD.read = false AND NEW.read = true THEN
    -- Уменьшаем счетчик для получателя
    UPDATE players
    SET unread_messages_count = GREATEST(COALESCE(unread_messages_count, 0) - 1, 0)
    WHERE id = NEW.receiver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Создаем триггер для автоматического обновления счетчика при чтении сообщения
DROP TRIGGER IF EXISTS messages_count_on_read ON messages;
CREATE TRIGGER messages_count_on_read
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_count_on_read();

-- 9. Инициализируем счетчики для всех пользователей на основе существующих непрочитанных сообщений
UPDATE players 
SET unread_messages_count = (
  SELECT COUNT(*)
  FROM messages 
  WHERE receiver_id = players.id 
  AND read = false
);

-- 10. Проверяем результат
SELECT 
  'Поле unread_messages_count добавлено!' as status,
  COUNT(*) as total_players,
  SUM(unread_messages_count) as total_unread_messages
FROM players;



