-- ============================================
-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ MESSAGES
-- ============================================
-- ВНИМАНИЕ: Используйте ТОЛЬКО для диагностики!
-- После проверки обязательно включите RLS обратно

-- Временно отключаем RLS
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Проверяем статус
SELECT 
  'RLS временно отключен для messages!' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'messages';

-- После диагностики выполните restore_messages_rls_original.sql для восстановления RLS






