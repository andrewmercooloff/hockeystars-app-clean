-- ============================================
-- ИСПРАВЛЕНИЕ ПРОБЛЕМ ПРОИЗВОДИТЕЛЬНОСТИ: RLS Policies
-- ============================================
-- Исправляет предупреждения auth_rls_initplan и multiple_permissive_policies
-- Согласно Supabase Database Linter: https://supabase.com/docs/guides/database/database-linter

-- ============================================
-- 1. ИСПРАВЛЕНИЕ auth_rls_initplan
-- ============================================
-- Заменяем auth.uid() на (select auth.uid()) для оптимизации производительности
-- Это предотвращает переоценку функции для каждой строки

-- ============================================
-- 1.1. teams
-- ============================================

-- "Anyone can insert teams"
DROP POLICY IF EXISTS "Anyone can insert teams" ON teams;
CREATE POLICY "Anyone can insert teams" ON teams
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- "Anyone can update teams"
DROP POLICY IF EXISTS "Anyone can update teams" ON teams;
CREATE POLICY "Anyone can update teams" ON teams
  FOR UPDATE
  USING (true);

-- ============================================
-- 1.2. items
-- ============================================

-- "Users can delete their own items"
DROP POLICY IF EXISTS "Users can delete their own items" ON items;
CREATE POLICY "Users can delete their own items" ON items
  FOR DELETE
  USING ((select auth.uid())::text = owner_id::text);

-- "Players can delete own items"
DROP POLICY IF EXISTS "Players can delete own items" ON items;
CREATE POLICY "Players can delete own items" ON items
  FOR DELETE
  USING ((select auth.uid())::text = owner_id::text);

-- "Admins can delete any item"
DROP POLICY IF EXISTS "Admins can delete any item" ON items;
CREATE POLICY "Admins can delete any item" ON items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 1.3. stats_changes
-- ============================================

-- "Users can view their own stats changes"
DROP POLICY IF EXISTS "Users can view their own stats changes" ON stats_changes;
CREATE POLICY "Users can view their own stats changes" ON stats_changes
  FOR SELECT
  USING ((select auth.uid()) = player_id);

-- "Users can insert their own stats changes"
DROP POLICY IF EXISTS "Users can insert their own stats changes" ON stats_changes;
CREATE POLICY "Users can insert their own stats changes" ON stats_changes
  FOR INSERT
  WITH CHECK ((select auth.uid()) = player_id);

-- "Users can update their own stats changes"
DROP POLICY IF EXISTS "Users can update their own stats changes" ON stats_changes;
CREATE POLICY "Users can update their own stats changes" ON stats_changes
  FOR UPDATE
  USING ((select auth.uid()) = player_id);

-- "Users can delete their own stats changes"
DROP POLICY IF EXISTS "Users can delete their own stats changes" ON stats_changes;
CREATE POLICY "Users can delete their own stats changes" ON stats_changes
  FOR DELETE
  USING ((select auth.uid()) = player_id);

-- "Admins can manage all stats changes"
DROP POLICY IF EXISTS "Admins can manage all stats changes" ON stats_changes;
CREATE POLICY "Admins can manage all stats changes" ON stats_changes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 1.4. exercises
-- ============================================

-- "Authenticated users can read all exercises"
DROP POLICY IF EXISTS "Authenticated users can read all exercises" ON exercises;
CREATE POLICY "Authenticated users can read all exercises" ON exercises
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- "Only admins can modify exercises"
DROP POLICY IF EXISTS "Only admins can modify exercises" ON exercises;
CREATE POLICY "Only admins can modify exercises" ON exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 1.5. teams_extended
-- ============================================

-- "Teams extended can be inserted by authenticated users"
DROP POLICY IF EXISTS "Teams extended can be inserted by authenticated users" ON teams_extended;
CREATE POLICY "Teams extended can be inserted by authenticated users" ON teams_extended
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================
-- 1.6. tournaments
-- ============================================

-- "Tournaments can be inserted by authenticated users"
DROP POLICY IF EXISTS "Tournaments can be inserted by authenticated users" ON tournaments;
CREATE POLICY "Tournaments can be inserted by authenticated users" ON tournaments
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================
-- 1.7. hockey_shops
-- ============================================

-- "Hockey shops can be inserted by authenticated users"
DROP POLICY IF EXISTS "Hockey shops can be inserted by authenticated users" ON hockey_shops;
CREATE POLICY "Hockey shops can be inserted by authenticated users" ON hockey_shops
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================
-- 1.8. player_teams
-- ============================================

-- "Players can insert own team associations"
DROP POLICY IF EXISTS "Players can insert own team associations" ON player_teams;
CREATE POLICY "Players can insert own team associations" ON player_teams
  FOR INSERT
  WITH CHECK ((select auth.uid())::text = player_id::text);

-- "Players can update own team associations"
DROP POLICY IF EXISTS "Players can update own team associations" ON player_teams;
CREATE POLICY "Players can update own team associations" ON player_teams
  FOR UPDATE
  USING ((select auth.uid())::text = player_id::text);

-- "Players can delete own team associations"
DROP POLICY IF EXISTS "Players can delete own team associations" ON player_teams;
CREATE POLICY "Players can delete own team associations" ON player_teams
  FOR DELETE
  USING ((select auth.uid())::text = player_id::text);

-- ============================================
-- 1.9. push_tokens
-- ============================================

-- "Users can manage own push token"
DROP POLICY IF EXISTS "Users can manage own push token" ON push_tokens;
CREATE POLICY "Users can manage own push token" ON push_tokens
  FOR ALL
  USING ((select auth.uid())::text = user_id::text);

-- "Admin can read all tokens"
DROP POLICY IF EXISTS "Admin can read all tokens" ON push_tokens;
CREATE POLICY "Admin can read all tokens" ON push_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 1.10. player_museum
-- ============================================

-- "Allow delete museum items"
DROP POLICY IF EXISTS "Allow delete museum items" ON player_museum;
CREATE POLICY "Allow delete museum items" ON player_museum
  FOR DELETE
  USING ((select auth.uid())::text = player_id::text);

-- "Allow delete for owner and admin"
DROP POLICY IF EXISTS "Allow delete for owner and admin" ON player_museum;
CREATE POLICY "Allow delete for owner and admin" ON player_museum
  FOR DELETE
  USING (
    (select auth.uid())::text = player_id::text
    OR EXISTS (
      SELECT 1 FROM players
      WHERE id = (select auth.uid())
      AND status = 'admin'
    )
  );

-- ============================================
-- 2. ИСПРАВЛЕНИЕ multiple_permissive_policies
-- ============================================
-- Объединяем дублирующиеся политики в одну

-- ============================================
-- 2.1. exercises - объединяем SELECT политики
-- ============================================
-- НЕ удаляем "Anyone can read active exercises" - она нужна для неаутентифицированных пользователей
-- Обе политики должны существовать:
-- - "Anyone can read active exercises" - для всех (включая неаутентифицированных)
-- - "Authenticated users can read all exercises" - для аутентифицированных (все упражнения)

-- Исправляем политику "Anyone can read active exercises" для оптимизации
-- (хотя в ней не используется auth.uid(), но оставляем для консистентности)
DROP POLICY IF EXISTS "Anyone can read active exercises" ON exercises;
CREATE POLICY "Anyone can read active exercises" ON exercises
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- 2.2. items - объединяем DELETE политики
-- ============================================
-- У нас уже есть три политики:
-- - "Users can delete their own items" (для обычных пользователей)
-- - "Players can delete own items" (дубликат, можно удалить)
-- - "Admins can delete any item" (для админов)

-- Удаляем дублирующуюся политику "Players can delete own items"
-- (она идентична "Users can delete their own items")
DROP POLICY IF EXISTS "Players can delete own items" ON items;

-- ============================================
-- 2.3. player_museum - объединяем DELETE политики
-- ============================================
-- У нас есть две политики:
-- - "Allow delete museum items" (только для владельца)
-- - "Allow delete for owner and admin" (для владельца и админа)

-- Удаляем первую политику, так как вторая покрывает её функциональность
DROP POLICY IF EXISTS "Allow delete museum items" ON player_museum;

-- ============================================
-- 2.4. player_teams - объединяем SELECT политики
-- ============================================
-- Удаляем дублирующуюся политику "Player teams are viewable by everyone"
-- Оставляем "Anyone can view player teams" (если она существует)

DROP POLICY IF EXISTS "Player teams are viewable by everyone" ON player_teams;

-- Если "Anyone can view player teams" не существует, создаём её
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'player_teams'
    AND policyname = 'Anyone can view player teams'
  ) THEN
    CREATE POLICY "Anyone can view player teams" ON player_teams
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================
-- 2.5. push_tokens - объединяем политики
-- ============================================
-- У нас есть несколько политик для одной роли и действия:
-- - "Allow insert push tokens" (дубликат "Users can manage own push token")
-- - "Allow read own push tokens" (дубликат "Users can manage own push token")
-- - "Allow update push tokens" (дубликат "Users can manage own push token")
-- - "Users can manage own push token" (FOR ALL - покрывает всё)
-- - "Admin can read all tokens" (отдельная для админов)

-- Удаляем дублирующиеся политики
DROP POLICY IF EXISTS "Allow insert push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow read own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Allow update push tokens" ON push_tokens;

-- ============================================
-- 2.6. stats_changes - объединяем политики
-- ============================================
-- У нас уже есть объединённая политика "Admins can manage all stats changes" (FOR ALL)
-- и отдельные политики для пользователей. Это правильно, оставляем как есть.

-- ============================================
-- 3. ИСПРАВЛЕНИЕ duplicate_index
-- ============================================

-- Удаляем дублирующийся индекс на activity_log
-- Оставляем один из индексов (idx_activity_log_activity_type или idx_activity_log_type)
-- Проверяем, какой индекс существует, и удаляем дубликат

DO $$
BEGIN
  -- Проверяем существование индексов
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'activity_log'
    AND indexname = 'idx_activity_log_activity_type'
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'activity_log'
    AND indexname = 'idx_activity_log_type'
  ) THEN
    -- Проверяем, идентичны ли индексы (проверяем колонки)
    IF EXISTS (
      SELECT 1
      FROM pg_indexes i1
      JOIN pg_indexes i2 ON i1.tablename = i2.tablename
      WHERE i1.schemaname = 'public'
      AND i1.tablename = 'activity_log'
      AND i1.indexname = 'idx_activity_log_activity_type'
      AND i2.indexname = 'idx_activity_log_type'
      AND i1.indexdef = i2.indexdef
    ) THEN
      -- Индексы идентичны, удаляем один из них
      DROP INDEX IF EXISTS idx_activity_log_type;
      RAISE NOTICE 'Удалён дублирующийся индекс idx_activity_log_type';
    ELSE
      -- Индексы разные, но возможно на одной колонке
      -- Удаляем idx_activity_log_type, оставляем idx_activity_log_activity_type
      DROP INDEX IF EXISTS idx_activity_log_type;
      RAISE NOTICE 'Удалён индекс idx_activity_log_type (возможно дубликат)';
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================

-- Проверяем, что все политики используют (select auth.uid())
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN (qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%') THEN '✅ ИСПРАВЛЕНО'
    WHEN (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%') THEN '⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЯ'
    ELSE 'ℹ️ НЕ ТРЕБУЕТ ИСПРАВЛЕНИЯ'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename IN (
      'teams', 'items', 'stats_changes', 'exercises',
      'teams_extended', 'tournaments', 'hockey_shops',
      'player_teams', 'push_tokens', 'player_museum'
    )
  )
ORDER BY tablename, policyname;

-- Проверяем дублирующиеся индексы
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'activity_log'
ORDER BY indexname;

-- ✅ Исправление проблем производительности завершено!
-- Проверьте результаты выше и убедитесь, что все политики используют (select auth.uid())

