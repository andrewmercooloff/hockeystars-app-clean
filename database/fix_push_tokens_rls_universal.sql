-- Исправление RLS политик для push_tokens (универсальная версия)
-- Проблема: "new row violates row-level security policy for table \"push_tokens\""
-- Причина: конфликтующие политики и возможные проблемы с NULL в auth.uid()
-- 
-- ВАЖНО: Этот скрипт работает для обоих случаев:
-- 1. Если user_id - TEXT: использует ::text для приведения типов
-- 2. Если user_id - UUID: сравнивает UUID напрямую
--
-- Сначала проверьте тип user_id:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'push_tokens' AND column_name = 'user_id';

-- Удаляем ВСЕ существующие политики для push_tokens (включая возможные конфликты)
DROP POLICY IF EXISTS "Users can view own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users and admins can read push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can manage own push token" ON push_tokens;
DROP POLICY IF EXISTS "Admin can read all tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow insert push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow update push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow read own push tokens" ON push_tokens;

-- Включаем RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Определяем тип user_id и создаем соответствующие политики
DO $$
DECLARE
    user_id_type text;
BEGIN
    -- Проверяем тип user_id
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'user_id';
    
    -- Если user_id - TEXT, используем версию с ::text
    IF user_id_type = 'text' THEN
        -- Политика для SELECT: пользователи могут читать свои токены, админы - все
        EXECUTE '
        CREATE POLICY "Users and admins can read push tokens" ON push_tokens
          FOR SELECT
          TO authenticated
          USING (
            (auth.uid() IS NOT NULL AND auth.uid()::text = user_id)
            OR EXISTS (
              SELECT 1 FROM players
              WHERE id = auth.uid()
              AND status = ''admin''
              AND auth.uid() IS NOT NULL
            )
          )';
        
        -- Политика для INSERT
        EXECUTE '
        CREATE POLICY "Users can insert push tokens" ON push_tokens
          FOR INSERT
          TO authenticated
          WITH CHECK (
            auth.uid() IS NOT NULL
            AND user_id IS NOT NULL
            AND auth.uid()::text = user_id
          )';
        
        -- Политика для UPDATE
        EXECUTE '
        CREATE POLICY "Users can update push tokens" ON push_tokens
          FOR UPDATE
          TO authenticated
          USING (
            auth.uid() IS NOT NULL
            AND auth.uid()::text = user_id
          )
          WITH CHECK (
            auth.uid() IS NOT NULL
            AND auth.uid()::text = user_id
          )';
        
        -- Политика для DELETE
        EXECUTE '
        CREATE POLICY "Users can delete push tokens" ON push_tokens
          FOR DELETE
          TO authenticated
          USING (
            auth.uid() IS NOT NULL
            AND auth.uid()::text = user_id
          )';
    
    -- Если user_id - UUID, сравниваем напрямую
    ELSIF user_id_type = 'uuid' THEN
        -- Политика для SELECT: пользователи могут читать свои токены, админы - все
        EXECUTE '
        CREATE POLICY "Users and admins can read push tokens" ON push_tokens
          FOR SELECT
          TO authenticated
          USING (
            (auth.uid() IS NOT NULL AND auth.uid() = user_id)
            OR EXISTS (
              SELECT 1 FROM players
              WHERE id = auth.uid()
              AND status = ''admin''
              AND auth.uid() IS NOT NULL
            )
          )';
        
        -- Политика для INSERT
        EXECUTE '
        CREATE POLICY "Users can insert push tokens" ON push_tokens
          FOR INSERT
          TO authenticated
          WITH CHECK (
            auth.uid() IS NOT NULL
            AND user_id IS NOT NULL
            AND auth.uid() = user_id
          )';
        
        -- Политика для UPDATE
        EXECUTE '
        CREATE POLICY "Users can update push tokens" ON push_tokens
          FOR UPDATE
          TO authenticated
          USING (
            auth.uid() IS NOT NULL
            AND auth.uid() = user_id
          )
          WITH CHECK (
            auth.uid() IS NOT NULL
            AND auth.uid() = user_id
          )';
        
        -- Политика для DELETE
        EXECUTE '
        CREATE POLICY "Users can delete push tokens" ON push_tokens
          FOR DELETE
          TO authenticated
          USING (
            auth.uid() IS NOT NULL
            AND auth.uid() = user_id
          )';
    ELSE
        RAISE EXCEPTION 'Неизвестный тип user_id: %', user_id_type;
    END IF;
END $$;

-- Комментарии
COMMENT ON POLICY "Users and admins can read push tokens" ON push_tokens IS 'Разрешает пользователям читать свои токены, админам - все';
COMMENT ON POLICY "Users can insert push tokens" ON push_tokens IS 'Разрешает аутентифицированным пользователям вставлять токены только для себя (проверяет auth.uid() IS NOT NULL)';
COMMENT ON POLICY "Users can update push tokens" ON push_tokens IS 'Разрешает пользователям обновлять только свои токены (проверяет auth.uid() IS NOT NULL)';
COMMENT ON POLICY "Users can delete push tokens" ON push_tokens IS 'Разрешает пользователям удалять только свои токены (проверяет auth.uid() IS NOT NULL)';

