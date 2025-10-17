-- Временно отключаем RLS для тестирования системы рейтинга
ALTER TABLE activity_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- Или создаем более простые политики
-- DROP POLICY IF EXISTS "Users can insert own activity log" ON activity_log;
-- CREATE POLICY "Allow all inserts" ON activity_log FOR INSERT WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can insert own activity points" ON activity_points;
-- CREATE POLICY "Allow all inserts" ON activity_points FOR INSERT WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can update own activity points" ON activity_points;
-- CREATE POLICY "Allow all updates" ON activity_points FOR UPDATE USING (true);
