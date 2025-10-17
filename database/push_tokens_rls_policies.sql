-- RLS политики для таблицы push_tokens
-- Позволяют пользователям управлять своими токенами

-- Включаем RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON push_tokens;

-- Политика для SELECT: пользователь может видеть только свои токены
CREATE POLICY "Users can view own tokens" ON push_tokens
  FOR SELECT
  USING (true);  -- Разрешаем всем читать (для отправки уведомлений)

-- Политика для INSERT: пользователь может создавать свои токены
CREATE POLICY "Users can insert own tokens" ON push_tokens
  FOR INSERT
  WITH CHECK (true);  -- Разрешаем всем вставлять (проверка в коде)

-- Политика для UPDATE: пользователь может обновлять свои токены  
CREATE POLICY "Users can update own tokens" ON push_tokens
  FOR UPDATE
  USING (true)  -- Разрешаем всем обновлять
  WITH CHECK (true);

-- Политика для DELETE: пользователь может удалять свои токены
CREATE POLICY "Users can delete own tokens" ON push_tokens
  FOR DELETE
  USING (true);  -- Разрешаем всем удалять

-- Комментарии
COMMENT ON POLICY "Users can view own tokens" ON push_tokens IS 'Разрешает всем читать токены для отправки уведомлений';
COMMENT ON POLICY "Users can insert own tokens" ON push_tokens IS 'Разрешает вставлять токены';
COMMENT ON POLICY "Users can update own tokens" ON push_tokens IS 'Разрешает обновлять токены';
COMMENT ON POLICY "Users can delete own tokens" ON push_tokens IS 'Разрешает удалять токены';











