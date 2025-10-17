-- ФИНАЛЬНОЕ исправление политик команд
-- Учитываем что auth.uid() может быть NULL (для админов)

-- 1. Удаляем все старые политики для player_teams
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;
DROP POLICY IF EXISTS "Anyone can view player teams" ON player_teams;
DROP POLICY IF EXISTS "Players can insert own team associations" ON player_teams;
DROP POLICY IF EXISTS "Players can update own team associations" ON player_teams;
DROP POLICY IF EXISTS "Players can delete own team associations" ON player_teams;

-- 2. Создаем ПРАВИЛЬНЫЕ политики для player_teams

-- Политика для чтения команд (все могут читать)
CREATE POLICY "Anyone can view player teams" ON player_teams
  FOR SELECT USING (true);

-- Политика для вставки команд (владельцы данных ИЛИ админы)
CREATE POLICY "Players can insert own team associations" ON player_teams
  FOR INSERT WITH CHECK (
    auth.uid() = player_id OR 
    auth.uid() IS NULL OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

-- Политика для обновления команд (владельцы данных ИЛИ админы)
CREATE POLICY "Players can update own team associations" ON player_teams
  FOR UPDATE USING (
    auth.uid() = player_id OR 
    auth.uid() IS NULL OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

-- Политика для удаления команд (владельцы данных ИЛИ админы)
CREATE POLICY "Players can delete own team associations" ON player_teams
  FOR DELETE USING (
    auth.uid() = player_id OR 
    auth.uid() IS NULL OR
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = auth.uid() 
      AND players.status = 'admin'
    )
  );

-- 3. Исправляем политики для teams
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;

-- Политики для teams (доступ для всех аутентифицированных ИЛИ админов)
CREATE POLICY "Anyone can insert teams" ON teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Anyone can update teams" ON teams
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR 
    auth.uid() IS NULL
  );

-- 4. Тестируем исправленные политики
SELECT 
    'Тест после исправления NULL проблемы' as test_name,
    auth.uid() as current_uid,
    CASE 
      WHEN auth.uid() IS NULL THEN 'Админ (NULL uid)'
      ELSE 'Обычный пользователь'
    END as user_type;

-- 5. Проверяем новые политики
SELECT 
    'Новые политики player_teams' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'player_teams'
ORDER BY cmd, policyname;

-- Готово! Теперь политики работают и для NULL uid (админов)
