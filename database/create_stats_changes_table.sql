-- Создание таблицы для хранения индикаторов изменений статистики
CREATE TABLE IF NOT EXISTS stats_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value NUMERIC(10,2) NOT NULL,
  new_value NUMERIC(10,2) NOT NULL,
  change_value NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_stats_changes_player_id ON stats_changes(player_id);
CREATE INDEX IF NOT EXISTS idx_stats_changes_expires_at ON stats_changes(expires_at);
CREATE INDEX IF NOT EXISTS idx_stats_changes_field ON stats_changes(field);

-- Включение RLS
ALTER TABLE stats_changes ENABLE ROW LEVEL SECURITY;

-- Политики RLS для stats_changes
CREATE POLICY "Users can view their own stats changes" ON stats_changes
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Users can insert their own stats changes" ON stats_changes
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own stats changes" ON stats_changes
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Users can delete their own stats changes" ON stats_changes
  FOR DELETE USING (auth.uid() = player_id);

-- Политика для админов (если auth.uid() IS NULL, значит это postgres)
CREATE POLICY "Admins can manage all stats changes" ON stats_changes
  FOR ALL USING (auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM players WHERE id = auth.uid() AND status = 'admin'
  ));

-- Функция для автоматической очистки истекших записей
CREATE OR REPLACE FUNCTION cleanup_expired_stats_changes()
RETURNS void AS $$
BEGIN
  DELETE FROM stats_changes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Создание задачи для автоматической очистки (если поддерживается)
-- Это будет выполняться вручную или через cron
