-- Функция для увеличения счетчика непрочитанных уведомлений
CREATE OR REPLACE FUNCTION increment_unread_notifications(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = COALESCE(unread_notifications_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для обнуления счетчика непрочитанных уведомлений
CREATE OR REPLACE FUNCTION reset_unread_notifications(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = 0
  WHERE id = user_id;
  
  RAISE NOTICE 'Счетчик уведомлений обнулен для пользователя %', user_id;
END;
$$ LANGUAGE plpgsql;









