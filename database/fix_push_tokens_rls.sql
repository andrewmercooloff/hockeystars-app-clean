-- Исправление RLS политик для push_tokens
-- Проблема: "new row violates row-level security policy for table \"push_tokens\""
-- Причина: конфликтующие политики и возможные проблемы с NULL в auth.uid()

-- ВАЖНО: Проверяем тип user_id в таблице
-- Если user_id - TEXT, используйте версию с ::text
-- Если user_id - UUID, используйте версию без ::text (текущая версия)
-- Выполните этот запрос, чтобы проверить тип:
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

-- Политика для SELECT: пользователи могут читать свои токены, админы - все
-- Используем правильное сравнение UUID с UUID (user_id - UUID, auth.uid() - UUID)
CREATE POLICY "Users and admins can read push tokens" ON push_tokens
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = auth.uid()
      AND status = 'admin'
      AND auth.uid() IS NOT NULL
    )
  );

-- Политика для INSERT: пользователи могут вставлять токены только для себя
-- ВАЖНО: проверяем, что auth.uid() не NULL и совпадает с user_id
-- Сравниваем UUID с UUID напрямую
CREATE POLICY "Users can insert push tokens" ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IS NOT NULL
    AND auth.uid() = user_id
  );

-- Политика для UPDATE: пользователи могут обновлять только свои токены
-- Сравниваем UUID с UUID напрямую
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
  );

-- Политика для DELETE: пользователи могут удалять только свои токены
-- Сравниваем UUID с UUID напрямую
CREATE POLICY "Users can delete push tokens" ON push_tokens
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- Комментарии
COMMENT ON POLICY "Users and admins can read push tokens" ON push_tokens IS 'Разрешает пользователям читать свои токены, админам - все';
COMMENT ON POLICY "Users can insert push tokens" ON push_tokens IS 'Разрешает аутентифицированным пользователям вставлять токены только для себя (проверяет auth.uid() IS NOT NULL)';
COMMENT ON POLICY "Users can update push tokens" ON push_tokens IS 'Разрешает пользователям обновлять только свои токены (проверяет auth.uid() IS NOT NULL)';
COMMENT ON POLICY "Users can delete push tokens" ON push_tokens IS 'Разрешает пользователям удалять только свои токены (проверяет auth.uid() IS NOT NULL)';

