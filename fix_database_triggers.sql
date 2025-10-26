-- ============================================
-- ИСПРАВЛЕНИЕ ПРОБЛЕМ С ТРИГГЕРАМИ И ДУБЛИРОВАНИЕМ
-- ============================================

-- 1. Удаляем все существующие триггеры для сообщений
DROP TRIGGER IF EXISTS messages_count_on_send ON messages;
DROP TRIGGER IF EXISTS messages_count_on_read ON messages;
DROP TRIGGER IF EXISTS trg_increment_unread_messages ON messages;
DROP TRIGGER IF EXISTS trg_decrement_unread_messages_on_read ON messages;

-- 2. Удаляем все функции для сообщений
DROP FUNCTION IF EXISTS increment_unread_messages(UUID);
DROP FUNCTION IF EXISTS reset_unread_messages(UUID);
DROP FUNCTION IF EXISTS update_messages_count_on_send();
DROP FUNCTION IF EXISTS update_messages_count_on_read();
DROP FUNCTION IF EXISTS increment_unread_messages();
DROP FUNCTION IF EXISTS decrement_unread_messages_on_read();

-- 3. Создаем простую функцию для увеличения счетчика
CREATE OR REPLACE FUNCTION increment_unread_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Увеличиваем счетчик только если сообщение отправлено другому пользователю и оно непрочитано
  IF NEW.sender_id <> NEW.receiver_id AND NEW.read = FALSE THEN
    UPDATE players
    SET unread_messages_count = COALESCE(unread_messages_count, 0) + 1
    WHERE id = NEW.receiver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем простую функцию для уменьшения счетчика
CREATE OR REPLACE FUNCTION decrement_unread_messages_on_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Уменьшаем счетчик только если сообщение было непрочитанным и стало прочитанным
  IF OLD.read = FALSE AND NEW.read = TRUE THEN
    UPDATE players
    SET unread_messages_count = GREATEST(0, COALESCE(unread_messages_count, 0) - 1)
    WHERE id = NEW.receiver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем единственный триггер для увеличения счетчика при вставке
CREATE TRIGGER trg_increment_unread_messages
  AFTER INSERT ON messages
  FOR EACH ROW 
  EXECUTE FUNCTION increment_unread_messages();

-- 6. Создаем единственный триггер для уменьшения счетчика при обновлении
CREATE TRIGGER trg_decrement_unread_messages_on_read
  AFTER UPDATE OF read ON messages
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_unread_messages_on_read();

-- 7. Пересчитываем счетчики для всех пользователей
UPDATE players 
SET unread_messages_count = (
  SELECT COUNT(*)
  FROM messages 
  WHERE receiver_id = players.id 
  AND read = false
);

-- 8. Проверяем результат
SELECT 
  'Триггеры исправлены!' as status,
  COUNT(*) as total_players,
  SUM(unread_messages_count) as total_unread_messages
FROM players;


