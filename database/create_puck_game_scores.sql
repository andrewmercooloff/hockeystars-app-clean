-- Puck Game Leaderboard table - Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.puck_game_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_avatar TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_puck_game_scores_score ON public.puck_game_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_puck_game_scores_player ON public.puck_game_scores (player_id);

ALTER TABLE public.puck_game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY \
Anyone
can
read
scores\ ON public.puck_game_scores FOR SELECT USING (true);
CREATE POLICY \Authenticated
users
can
insert
own
scores\ ON public.puck_game_scores FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.puck_game_scores TO anon;
GRANT SELECT, INSERT ON public.puck_game_scores TO authenticated;
GRANT ALL ON public.puck_game_scores TO service_role;
