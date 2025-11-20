-- ============================================
-- ВОССТАНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ PUSH_TOKENS ИЗ BACKUP (15-11-2025)
-- ============================================
-- Эти политики были в backup и работали раньше!
-- Они разрешают всем authenticated пользователям работать с push tokens

-- Удаляем ВСЕ существующие политики для push_tokens
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

-- ВОССТАНОВЛЕНИЕ ОРИГИНАЛЬНЫХ ПОЛИТИК ИЗ BACKUP:
-- Эти политики были в backup и работали!

-- 1. SELECT - все authenticated пользователи могут читать все токены
CREATE POLICY "Allow read own push tokens" ON public.push_tokens 
FOR SELECT 
USING (true);

-- 2. INSERT - все authenticated пользователи могут вставлять токены
CREATE POLICY "Allow insert push tokens" ON public.push_tokens 
FOR INSERT 
WITH CHECK (true);

-- 3. UPDATE - все authenticated пользователи могут обновлять токены
CREATE POLICY "Allow update push tokens" ON public.push_tokens 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 4. DELETE - можно добавить, если нужно (в backup не было явной политики для DELETE)
-- Но обычно достаточно первых трех

-- Дополнительная политика для админов (была в backup):
-- Админы могут читать все токены
CREATE POLICY "Admin can read all tokens" ON public.push_tokens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.players
    WHERE id = auth.uid()
    AND status = 'admin'
  )
);

-- Проверяем созданные политики
SELECT 
  '✅ Политики RLS восстановлены из backup!' as status,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'push_tokens'
ORDER BY policyname;

-- Проверяем количество токенов
SELECT 
  '📊 Всего push токенов в таблице:' as info,
  COUNT(*) as total_tokens
FROM push_tokens;







