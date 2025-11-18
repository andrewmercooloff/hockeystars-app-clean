-- ============================================
-- ВОССТАНОВЛЕНИЕ ВСЕХ RLS ПОЛИТИК ИЗ BACKUP (15-11-2025)
-- ============================================
-- Этот скрипт восстанавливает все политики, которые могут пострадать
-- от кастомной авторизации (когда auth.uid() = NULL)

-- ============================================
-- 1. NOTIFICATIONS (уже должны быть правильные, но проверим)
-- ============================================
-- В backup были политики с USING (true) - они должны работать

-- ============================================
-- 2. FRIEND_REQUESTS (проверяем)
-- ============================================
-- В backup были:
-- "Friend requests are viewable by everyone" USING (true)
-- "Friend requests can be inserted by anyone" WITH CHECK (true)
-- "Friend requests can be updated by anyone" USING (true)
-- "Friend requests can be deleted by anyone" USING (true)

-- ============================================
-- 3. ITEMS (может быть проблема с auth.uid())
-- ============================================
-- В backup были политики с auth.uid(), но также были:
-- "Items are viewable by everyone" USING (true)
-- "Authenticated users can insert items" WITH CHECK (true)
-- "Authenticated users can update items" USING (true)

-- ============================================
-- 4. ITEM_REQUESTS (проверяем)
-- ============================================
-- В backup были:
-- "Item requests are viewable by authenticated users" USING (true)
-- "Authenticated users can insert item requests" WITH CHECK (true)
-- "Item owners can update requests" USING (true)
-- "Users can delete own requests" USING (true)

-- ============================================
-- 5. PLAYER_MUSEUM (может быть проблема с auth.uid())
-- ============================================
-- В backup были:
-- "Museum items are viewable by everyone" USING (true)
-- "Authenticated users can insert museum items" WITH CHECK (true)
-- Но также были политики с auth.uid()

-- ============================================
-- 6. STATS_CHANGES (проблема с auth.uid())
-- ============================================
-- В backup были политики с auth.uid() = player_id
-- Это может не работать с кастомной авторизацией!

-- Проверяем текущие политики для stats_changes
SELECT 
  'Текущие политики для stats_changes:' as info,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'stats_changes'
ORDER BY policyname;

-- ============================================
-- 7. PLAYER_TEAMS (может быть проблема с auth.uid())
-- ============================================
-- В backup были политики с auth.uid(), но также:
-- "Player teams are viewable by everyone" USING (true)
-- И политики с проверкой auth.uid() OR auth.uid() IS NULL

-- ============================================
-- 8. LIKES (проверяем)
-- ============================================
-- В backup были:
-- "Users can view all likes" USING (true)
-- "Users can create their own likes" WITH CHECK (true)
-- "Users can delete their own likes" USING (true)

-- ============================================
-- 9. EXERCISES (проверяем)
-- ============================================
-- В backup были:
-- "Anyone can read active exercises" USING (is_active = true)
-- "Authenticated users can read all exercises" USING (auth.role() = 'authenticated')
-- "Only admins can modify exercises" - использует проверку админа

-- ============================================
-- 10. TEAMS (проверяем)
-- ============================================
-- В backup были:
-- "Teams are viewable by everyone" USING (true)
-- "Anyone can insert teams" WITH CHECK ((auth.uid() IS NOT NULL) OR (auth.uid() IS NULL))
-- "Anyone can update teams" USING ((auth.uid() IS NOT NULL) OR (auth.uid() IS NULL))

-- ============================================
-- ВАЖНО: Проверяем все таблицы с RLS
-- ============================================
SELECT 
  'Таблицы с включенным RLS:' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;

-- ============================================
-- Проверяем политики, которые используют auth.uid()
-- ============================================
SELECT 
  'Политики, использующие auth.uid() (могут не работать с кастомной авторизацией):' as warning,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
ORDER BY tablename, policyname;

-- ============================================
-- ИНФОРМАЦИЯ
-- ============================================
SELECT 
  'ℹ️ Проверьте результаты выше!' as info,
  'Политики с USING (true) или WITH CHECK (true) работают с кастомной авторизацией' as note1,
  'Политики с auth.uid() могут не работать, если auth.uid() = NULL' as note2,
  'Если что-то не работает, нужно восстановить политики из backup' as note3;





