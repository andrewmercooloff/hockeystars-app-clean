-- Profile & feed reactions for HockeyStars
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS profile_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('respect', 'like', 'strength', 'high_five')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_player_id, sender_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_profile_reactions_target ON profile_reactions (target_player_id);
CREATE INDEX IF NOT EXISTS idx_profile_reactions_sender ON profile_reactions (sender_id);

CREATE TABLE IF NOT EXISTS notification_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('respect', 'fire', 'strength', 'lightning')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, sender_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reactions_notif ON notification_reactions (notification_id);

ALTER TABLE profile_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_reactions_select ON profile_reactions;
CREATE POLICY profile_reactions_select ON profile_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profile_reactions_insert ON profile_reactions;
CREATE POLICY profile_reactions_insert ON profile_reactions
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS profile_reactions_delete ON profile_reactions;
CREATE POLICY profile_reactions_delete ON profile_reactions
  FOR DELETE USING (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS notification_reactions_select ON notification_reactions;
CREATE POLICY notification_reactions_select ON notification_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS notification_reactions_insert ON notification_reactions;
CREATE POLICY notification_reactions_insert ON notification_reactions
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS notification_reactions_update ON notification_reactions;
CREATE POLICY notification_reactions_update ON notification_reactions
  FOR UPDATE USING (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS notification_reactions_delete ON notification_reactions;
CREATE POLICY notification_reactions_delete ON notification_reactions
  FOR DELETE USING (auth.uid()::text = sender_id::text OR true);
