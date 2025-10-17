-- ИСПРАВЛЕННЫЕ политики для player_teams (без ошибок типов)
-- Проблема была в приведении auth.uid()::text - нужно использовать uuid = uuid

-- 1. Удаляем все старые политики для player_teams
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;
DROP POLICY IF EXISTS "Anyone can view player teams" ON player_teams;
DROP POLICY IF EXISTS "Players can insert own team associations" ON player_teams;
DROP POLICY IF EXISTS "Players can update own team associations" ON player_teams;
DROP POLICY IF EXISTS "Players can delete own team associations" ON player_teams;

-- 2. Создаем ПРАВИЛЬНЫЕ политики для player_teams (uuid = uuid)

-- Политика для чтения команд (все могут читать)
CREATE POLICY "Anyone can view player teams" ON player_teams
  FOR SELECT USING (true);

-- Политика для вставки команд (игроки могут добавлять свои команды)
CREATE POLICY "Players can insert own team associations" ON player_teams
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Политика для обновления команд (игроки могут обновлять свои команды)
CREATE POLICY "Players can update own team associations" ON player_teams
  FOR UPDATE USING (auth.uid() = player_id);

-- Политика для удаления команд (игроки могут удалять свои команды)
CREATE POLICY "Players can delete own team associations" ON player_teams
  FOR DELETE USING (auth.uid() = player_id);

-- 3. Также исправляем политики для teams
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;

-- Создаем правильные политики для teams
CREATE POLICY "Authenticated users can insert teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update teams" ON teams
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. Проверяем что типы данных совпадают
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'player_teams' 
AND table_schema = 'public'
AND column_name = 'player_id';

-- 5. Тестируем исправленные политики
SELECT 
    'Тест после исправления типов' as test_name,
    COUNT(*) as record_count
FROM player_teams
WHERE player_id = auth.uid();

-- Готово! Теперь типы данных совпадают: uuid = uuid
