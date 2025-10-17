-- Исправление политик для player_teams (проблема с сохранением профиля)
-- Текущие политики слишком ограничительные для операций с командами

-- 1. Удаляем старые ограничительные политики
DROP POLICY IF EXISTS "Players can manage own team associations" ON player_teams;

-- 2. Создаем более детальные политики для каждой операции

-- Политика для чтения команд (все могут читать)
CREATE POLICY "Anyone can view player teams" ON player_teams
  FOR SELECT USING (true);

-- Политика для вставки команд (игроки могут добавлять свои команды)
CREATE POLICY "Players can insert own team associations" ON player_teams
  FOR INSERT WITH CHECK (auth.uid()::text = player_id::text);

-- Политика для обновления команд (игроки могут обновлять свои команды)
CREATE POLICY "Players can update own team associations" ON player_teams
  FOR UPDATE USING (auth.uid()::text = player_id::text);

-- Политика для удаления команд (игроки могут удалять свои команды)
CREATE POLICY "Players can delete own team associations" ON player_teams
  FOR DELETE USING (auth.uid()::text = player_id::text);

-- 3. Также исправляем политики для teams (могут понадобиться для создания новых команд)
DROP POLICY IF EXISTS "Teams can be inserted by authenticated users" ON teams;

-- Создаем более гибкую политику для команд
CREATE POLICY "Authenticated users can insert teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Разрешаем обновление команд для аутентифицированных пользователей
CREATE POLICY "Authenticated users can update teams" ON teams
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. Проверяем результат
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('player_teams', 'teams')
ORDER BY tablename, policyname;

-- Готово! Теперь сохранение профиля должно работать
