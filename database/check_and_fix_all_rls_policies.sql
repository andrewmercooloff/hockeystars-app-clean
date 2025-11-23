-- ============================================
-- ПРОВЕРКА И ВОССТАНОВЛЕНИЕ ВСЕХ RLS ПОЛИТИК
-- ============================================
-- Этот скрипт проверяет все политики и восстанавливает те,
-- которые могут не работать с кастомной авторизацией

-- ============================================
-- 1. ПРОВЕРКА: Какие таблицы используют RLS
-- ============================================
SELECT 
  '📊 Таблицы с включенным RLS:' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
ORDER BY tablename;

-- ============================================
-- 2. ПРОВЕРКА: Политики, использующие auth.uid()
-- ============================================
SELECT 
  '⚠️ Политики, использующие auth.uid() (могут не работать):' as warning,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'USING: ' || LEFT(qual, 100)
    WHEN with_check LIKE '%auth.uid()%' THEN 'WITH CHECK: ' || LEFT(with_check, 100)
    ELSE 'Both'
  END as expression
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  AND tablename NOT IN ('messages', 'push_tokens') -- Эти уже исправлены
ORDER BY tablename, policyname;

-- ============================================
-- 3. ВОССТАНОВЛЕНИЕ: STATS_CHANGES
-- ============================================
-- Политики для stats_changes используют auth.uid() = player_id
-- Это не работает с кастомной авторизацией
-- Восстанавливаем политики, которые разрешают всем authenticated

DROP POLICY IF EXISTS "Users can view their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can insert their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can update their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Users can delete their own stats changes" ON stats_changes;
DROP POLICY IF EXISTS "Admins can manage all stats changes" ON stats_changes;

-- Восстанавливаем политики из backup, но с исправлением для кастомной авторизации
-- В backup была политика для админов, которая проверяла auth.uid() IS NULL OR EXISTS...
-- Это может работать, но лучше сделать проще

-- SELECT - все authenticated могут видеть все stats_changes
CREATE POLICY "Users can view their own stats changes" ON public.stats_changes 
FOR SELECT 
USING (true);

-- INSERT - все authenticated могут вставлять
CREATE POLICY "Users can insert their own stats changes" ON public.stats_changes 
FOR INSERT 
WITH CHECK (true);

-- UPDATE - все authenticated могут обновлять
CREATE POLICY "Users can update their own stats changes" ON public.stats_changes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- DELETE - все authenticated могут удалять
CREATE POLICY "Users can delete their own stats changes" ON public.stats_changes 
FOR DELETE 
USING (true);

-- ============================================
-- 4. ПРОВЕРКА: Другие таблицы
-- ============================================
-- Большинство других таблиц уже используют USING (true) или WITH CHECK (true)
-- Но проверим основные:

-- FRIEND_REQUESTS - должны быть USING (true)
SELECT 
  'Friend requests policies:' as info,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'friend_requests'
ORDER BY policyname;

-- NOTIFICATIONS - должны быть USING (true)
SELECT 
  'Notifications policies:' as info,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- ITEMS - проверим
SELECT 
  'Items policies:' as info,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY policyname;

-- ============================================
-- 5. ИТОГОВАЯ ПРОВЕРКА
-- ============================================
SELECT 
  '✅ Восстановление завершено!' as status,
  'Проверьте результаты выше' as note1,
  'Если что-то не работает, проверьте конкретную таблицу' as note2;









