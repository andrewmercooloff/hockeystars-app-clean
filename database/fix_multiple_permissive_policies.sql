-- ============================================
-- ИСПРАВЛЕНИЕ multiple_permissive_policies
-- ============================================
-- Объединяем дублирующиеся политики в одну с OR условиями

-- ============================================
-- 1. EXERCISES - исправляем SELECT политики
-- ============================================
-- Проблема: обе политики применяются к роли authenticated
-- Решение: сделать так, чтобы "Anyone can read active exercises" применялась только к anon

DROP POLICY IF EXISTS "Anyone can read active exercises" ON exercises;
DROP POLICY IF EXISTS "Authenticated users can read all exercises" ON exercises;

-- Политика для анонимных пользователей (только активные упражнения)
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Политика для аутентифицированных пользователей (все упражнения)
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 2. ITEMS - объединяем DELETE политики
-- ============================================
-- Объединяем "Users can delete their own items" и "Admins can delete any item" в одну

DROP POLICY IF EXISTS "Users can delete their own items" ON items;
DROP POLICY IF EXISTS "Admins can delete any item" ON items;

-- Объединенная политика: пользователи могут удалять свои предметы, админы - любые
CREATE POLICY "Users and admins can delete items" ON items
  FOR DELETE
  TO authenticated
  USING (
    (select auth.uid())::text = owner_id::text
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 3. PUSH_TOKENS - объединяем SELECT политики
-- ============================================
-- Объединяем "Admin can read all tokens" и "Users can manage own push token" в одну

DROP POLICY IF EXISTS "Admin can read all tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can manage own push token" ON push_tokens;

-- Объединенная политика для SELECT
CREATE POLICY "Users and admins can read push tokens" ON push_tokens
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid())::text = user_id::text
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- Объединенная политика для INSERT, UPDATE, DELETE (из "Users can manage own push token")
-- Но сначала нужно проверить, есть ли отдельные политики для INSERT/UPDATE
-- Если есть, удалим их и создадим объединенные

DROP POLICY IF EXISTS "Allow insert push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow update push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow read own push tokens" ON push_tokens;

-- Политика для INSERT
CREATE POLICY "Users can insert push tokens" ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id::text);

-- Политика для UPDATE
CREATE POLICY "Users can update push tokens" ON push_tokens
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = user_id::text)
  WITH CHECK ((select auth.uid())::text = user_id::text);

-- Политика для DELETE
CREATE POLICY "Users can delete push tokens" ON push_tokens
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = user_id::text);

-- ============================================
-- 4. STATS_CHANGES - объединяем все политики
-- ============================================
-- Проблема: "Admins can manage all stats changes" использует FOR ALL, что создает дубликаты
-- Решение: разделить на отдельные политики и объединить с пользовательскими

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can insert their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can update their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can delete their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Admins can manage all stats changes" ON stats_changes;

-- Объединенные политики для SELECT
CREATE POLICY "Users and admins can view stats changes" ON stats_changes
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = player_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- Объединенные политики для INSERT
CREATE POLICY "Users and admins can insert stats changes" ON stats_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = player_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- Объединенные политики для UPDATE
CREATE POLICY "Users and admins can update stats changes" ON stats_changes
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = player_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  )
  WITH CHECK (
    (select auth.uid()) = player_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- Объединенные политики для DELETE
CREATE POLICY "Users and admins can delete stats changes" ON stats_changes
  FOR DELETE
  TO authenticated
  USING (
    (select auth.uid()) = player_id
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================

-- Проверяем политики для exercises
SELECT
  'exercises' as table_name,
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'exercises'
ORDER BY cmd, policyname;

-- Проверяем политики для items
SELECT
  'items' as table_name,
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'items'
  AND cmd = 'DELETE'
ORDER BY policyname;

-- Проверяем политики для push_tokens
SELECT
  'push_tokens' as table_name,
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'push_tokens'
ORDER BY cmd, policyname;

-- Проверяем политики для stats_changes
SELECT
  'stats_changes' as table_name,
  policyname,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'stats_changes'
ORDER BY cmd, policyname;

-- ✅ Политики объединены!
-- Теперь для каждой роли и действия есть только одна политика

