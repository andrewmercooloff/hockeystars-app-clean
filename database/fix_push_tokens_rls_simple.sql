-- ============================================
-- ПРОСТОЕ ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ PUSH_TOKENS
-- ============================================
-- Исправляет ошибку: "new row violates row-level security policy"

-- ШАГ 1: Удаляем ВСЕ существующие политики
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

-- ШАГ 2: Включаем RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- ШАГ 3: Проверяем тип user_id
SELECT 
  'Тип user_id:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'push_tokens' AND column_name = 'user_id';

-- ШАГ 4: Создаем политики (универсальные - работают для TEXT и UUID)
-- 4.1. SELECT - пользователи могут читать свои токены, админы - все
CREATE POLICY "Users and admins can read push tokens" ON push_tokens
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND (auth.uid()::text = user_id::text OR auth.uid() = user_id::uuid))
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = auth.uid()
      AND status = 'admin'
      AND auth.uid() IS NOT NULL
    )
  );

-- 4.2. INSERT - пользователи могут вставлять токены только для себя
CREATE POLICY "Users can insert push tokens" ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id IS NOT NULL
    AND (auth.uid()::text = user_id::text OR auth.uid() = user_id::uuid)
  );

-- 4.3. UPDATE - пользователи могут обновлять только свои токены
CREATE POLICY "Users can update push tokens" ON push_tokens
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.uid()::text = user_id::text OR auth.uid() = user_id::uuid)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (auth.uid()::text = user_id::text OR auth.uid() = user_id::uuid)
  );

-- 4.4. DELETE - пользователи могут удалять только свои токены
CREATE POLICY "Users can delete push tokens" ON push_tokens
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (auth.uid()::text = user_id::text OR auth.uid() = user_id::uuid)
  );

-- ШАГ 5: Проверяем созданные политики
SELECT 
  '✅ Политики RLS созданы!' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'push_tokens'
ORDER BY policyname;

-- ШАГ 6: Информация
SELECT 
  'ℹ️ Политики созданы!' as info,
  'Политики работают для TEXT и UUID типов user_id' as note;





