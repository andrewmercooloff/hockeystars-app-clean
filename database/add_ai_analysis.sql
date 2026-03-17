-- AI Analysis feature: add analysis storage to players and usage tracking table

-- 1. Add ai_analysis JSONB column to players
--    Structure: { text, translations:{lang:string}, is_public, generated_at }
ALTER TABLE players ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;

-- 2. Usage tracking table (max 3 analyses per player per calendar month)
CREATE TABLE IF NOT EXISTS ai_analysis_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, year, month)
);

ALTER TABLE ai_analysis_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_analysis_usage_select_all" ON ai_analysis_usage;
CREATE POLICY "ai_analysis_usage_select_all" ON ai_analysis_usage FOR SELECT USING (true);

DROP POLICY IF EXISTS "ai_analysis_usage_service" ON ai_analysis_usage;
CREATE POLICY "ai_analysis_usage_service" ON ai_analysis_usage FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_ai_analysis_usage_player_month ON ai_analysis_usage(player_id, year, month);
