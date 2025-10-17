-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ
-- ============================================

-- 1. Добавляем поле unread_notifications_count, если его еще нет
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS unread_notifications_count INTEGER DEFAULT 0;

-- 2. Инициализируем значения для существующих пользователей
UPDATE players 
SET unread_notifications_count = 0 
WHERE unread_notifications_count IS NULL;

-- 3. Создаем функцию для увеличения счетчика
CREATE OR REPLACE FUNCTION increment_unread_notifications(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = COALESCE(unread_notifications_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем функцию для обнуления счетчика
CREATE OR REPLACE FUNCTION reset_unread_notifications(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = 0
  WHERE id = user_id;
  
  RAISE NOTICE 'Счетчик уведомлений обнулен для пользователя %', user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Проверяем результат
SELECT 
  'Поле unread_notifications_count добавлено!' as status,
  COUNT(*) as total_players,
  SUM(unread_notifications_count) as total_unread
FROM players;









