-- Диагностика RLS политик для push_tokens
-- Запустите этот скрипт, чтобы проверить текущее состояние политик

-- 1. Проверяем все существующие политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'push_tokens'
ORDER BY policyname;

-- 2. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'push_tokens';

-- 3. Проверяем структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;

-- 4. Проверяем текущего пользователя (должен быть выполнен от имени аутентифицированного пользователя)
SELECT 
  auth.uid() as current_user_id,
  auth.uid()::text as current_user_id_text,
  (SELECT id::text FROM players WHERE id = auth.uid() LIMIT 1) as player_id_text;

