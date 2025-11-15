-- ============================================
-- ИСПРАВЛЕНИЕ ПРОБЛЕМ БЕЗОПАСНОСТИ: function_search_path_mutable
-- ============================================
-- Добавляем SET search_path для защиты от search_path injection атак
-- Согласно Supabase Database Linter: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 1. search_teams
DROP FUNCTION IF EXISTS search_teams(VARCHAR) CASCADE;
CREATE OR REPLACE FUNCTION search_teams(search_term VARCHAR(255))
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  type VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100)
) 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.country,
    t.city
  FROM teams t
  WHERE LOWER(t.name) LIKE LOWER('%' || search_term || '%')
  ORDER BY 
    CASE WHEN LOWER(t.name) = LOWER(search_term) THEN 1
         WHEN LOWER(t.name) LIKE LOWER(search_term || '%') THEN 2
         ELSE 3
    END,
    t.name
  LIMIT 10;
END;
$$;

-- 2. get_player_teams
-- Удаляем все варианты функции (может быть с разными сигнатурами)
DROP FUNCTION IF EXISTS get_player_teams(UUID) CASCADE;
CREATE OR REPLACE FUNCTION get_player_teams(player_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name VARCHAR(255),
  team_type VARCHAR(50),
  team_country VARCHAR(100),
  team_city VARCHAR(100),
  is_primary BOOLEAN,
  joined_date DATE,
  start_year INTEGER,
  end_year INTEGER
) 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.country,
    t.city,
    pt.is_primary,
    pt.joined_date,
    pt.start_year,
    pt.end_year
  FROM player_teams pt
  JOIN teams t ON pt.team_id = t.id
  WHERE pt.player_id = player_uuid
  ORDER BY pt.is_primary DESC, t.name;
END;
$$;

-- 3. increment_unread_notifications
DROP FUNCTION IF EXISTS increment_unread_notifications(UUID) CASCADE;
CREATE OR REPLACE FUNCTION increment_unread_notifications(user_id UUID)
RETURNS void 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = COALESCE(unread_notifications_count, 0) + 1
  WHERE id = user_id;
END;
$$;

-- 4. reset_unread_notifications
DROP FUNCTION IF EXISTS reset_unread_notifications(UUID) CASCADE;
CREATE OR REPLACE FUNCTION reset_unread_notifications(user_id UUID)
RETURNS void 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE players
  SET unread_notifications_count = 0
  WHERE id = user_id;
  
  RAISE NOTICE 'Счетчик уведомлений обнулен для пользователя %', user_id;
END;
$$;

-- 5. increment_unread_messages
-- Удаляем все варианты функции (может быть с параметром UUID или без)
DROP FUNCTION IF EXISTS increment_unread_messages() CASCADE;
DROP FUNCTION IF EXISTS increment_unread_messages(UUID) CASCADE;
CREATE OR REPLACE FUNCTION increment_unread_messages()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Увеличиваем счетчик только если сообщение отправлено другому пользователю и оно непрочитано
  IF NEW.sender_id <> NEW.receiver_id AND NEW.read = FALSE THEN
    UPDATE players
    SET unread_messages_count = COALESCE(unread_messages_count, 0) + 1
    WHERE id = NEW.receiver_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. decrement_unread_messages_on_read
DROP FUNCTION IF EXISTS decrement_unread_messages_on_read() CASCADE;
CREATE OR REPLACE FUNCTION decrement_unread_messages_on_read()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Уменьшаем счетчик только если сообщение было непрочитанным и стало прочитанным
  IF OLD.read = FALSE AND NEW.read = TRUE THEN
    UPDATE players
    SET unread_messages_count = GREATEST(0, COALESCE(unread_messages_count, 0) - 1)
    WHERE id = NEW.receiver_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. delete_item_by_user
DROP FUNCTION IF EXISTS delete_item_by_user(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION delete_item_by_user(
  item_id_param UUID,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item_owner_id UUID;
  requesting_user_status TEXT;
BEGIN
  -- Получаем owner_id подарка
  SELECT owner_id INTO item_owner_id
  FROM items
  WHERE id = item_id_param;
  
  IF item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Получаем статус запрашивающего пользователя
  SELECT status INTO requesting_user_status
  FROM players
  WHERE id = requesting_user_id;
  
  -- Разрешаем удаление если:
  -- 1. Пользователь - владелец подарка (owner_id)
  -- 2. Пользователь - админ
  IF item_owner_id = requesting_user_id OR requesting_user_status = 'admin' THEN
    DELETE FROM items WHERE id = item_id_param;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Permission denied: user % cannot delete item owned by %', 
      requesting_user_id, item_owner_id;
  END IF;
  
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error deleting item: %', SQLERRM;
END;
$$;

-- 8. delete_museum_item_by_user
DROP FUNCTION IF EXISTS delete_museum_item_by_user(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION delete_museum_item_by_user(
  museum_item_id UUID,
  requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  museum_player_id UUID;
  requesting_user_status TEXT;
BEGIN
  -- Получаем player_id из museum записи
  SELECT player_id INTO museum_player_id
  FROM player_museum
  WHERE id = museum_item_id;
  
  -- Если запись не найдена
  IF museum_player_id IS NULL THEN
    RAISE EXCEPTION 'Museum item not found';
  END IF;
  
  -- Получаем статус запрашивающего пользователя
  SELECT status INTO requesting_user_status
  FROM players
  WHERE id = requesting_user_id;
  
  -- Проверяем права:
  -- 1. Пользователь - владелец подарка
  -- 2. Пользователь - администратор
  IF museum_player_id = requesting_user_id OR requesting_user_status = 'admin' THEN
    -- Удаляем запись
    DELETE FROM player_museum WHERE id = museum_item_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Permission denied: user % cannot delete item for player %', 
      requesting_user_id, museum_player_id;
  END IF;
  
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error deleting museum item: %', SQLERRM;
END;
$$;

-- 9. delete_museum_item_admin
DROP FUNCTION IF EXISTS delete_museum_item_admin(UUID, UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION delete_museum_item_admin(
  museum_item_id UUID,
  item_id UUID,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Проверяем, что пользователь - администратор
  SELECT EXISTS(
    SELECT 1 FROM players 
    WHERE id = admin_user_id 
    AND status = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Только администратор может использовать эту функцию';
  END IF;
  
  -- Удаляем запись из музея
  DELETE FROM player_museum WHERE id = museum_item_id;
  
  -- Удаляем предмет
  DELETE FROM items WHERE id = item_id;
  
  RETURN TRUE;
END;
$$;

-- 10. check_team_years_overlap
DROP FUNCTION IF EXISTS check_team_years_overlap() CASCADE;
CREATE OR REPLACE FUNCTION check_team_years_overlap()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Проверяем, есть ли пересечение годов с существующими записями
  IF EXISTS (
    SELECT 1 FROM player_teams 
    WHERE player_id = NEW.player_id 
      AND team_id = NEW.team_id
      AND id != NEW.id
      AND (
        -- Проверяем пересечение годов
        (NEW.start_year IS NOT NULL AND NEW.end_year IS NOT NULL AND
         NEW.start_year <= COALESCE(end_year, 9999) AND 
         NEW.end_year >= COALESCE(start_year, 0))
        OR
        (NEW.start_year IS NULL AND NEW.end_year IS NULL AND
         start_year IS NULL AND end_year IS NULL)
        OR
        (NEW.start_year IS NOT NULL AND NEW.end_year IS NULL AND
         start_year IS NOT NULL AND end_year IS NULL AND
         NEW.start_year <= start_year)
        OR
        (NEW.start_year IS NULL AND NEW.end_year IS NOT NULL AND
         start_year IS NULL AND end_year IS NOT NULL AND
         NEW.end_year >= end_year)
      )
  ) THEN
    RAISE EXCEPTION 'Игрок уже состоит в этой команде в указанный период времени';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 11. update_exercises_updated_at
DROP FUNCTION IF EXISTS update_exercises_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. update_activity_points_updated_at
DROP FUNCTION IF EXISTS update_activity_points_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_activity_points_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 13. update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 14. cleanup_expired_email_verification_codes
-- УДАЛЯЕМ: Email авторизация не используется в проекте
DROP FUNCTION IF EXISTS cleanup_expired_email_verification_codes() CASCADE;

-- 15. update_modified_column
-- Исправляем функцию, если она существует
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$;

-- Проверка: все функции должны иметь SET search_path
SELECT 
  proname as function_name,
  CASE 
    WHEN proconfig IS NULL OR array_to_string(proconfig, ',') NOT LIKE '%search_path%' 
    THEN '⚠️ НЕ ИСПРАВЛЕНО'
    ELSE '✅ ИСПРАВЛЕНО'
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'search_teams',
    'get_player_teams',
    'increment_unread_notifications',
    'reset_unread_notifications',
    'increment_unread_messages',
    'decrement_unread_messages_on_read',
    'delete_item_by_user',
    'delete_museum_item_by_user',
    'delete_museum_item_admin',
    'check_team_years_overlap',
    'update_exercises_updated_at',
    'update_activity_points_updated_at',
    'update_updated_at_column',
    'update_modified_column'
  )
ORDER BY proname;

