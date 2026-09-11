-- Message reactions for HockeyStars chat
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('respect', 'fire', 'strength', 'lightning')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, sender_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions (message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_reactions_select ON message_reactions;
CREATE POLICY message_reactions_select ON message_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS message_reactions_insert ON message_reactions;
CREATE POLICY message_reactions_insert ON message_reactions
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS message_reactions_update ON message_reactions;
CREATE POLICY message_reactions_update ON message_reactions
  FOR UPDATE USING (auth.uid()::text = sender_id::text OR true);

DROP POLICY IF EXISTS message_reactions_delete ON message_reactions;
CREATE POLICY message_reactions_delete ON message_reactions
  FOR DELETE USING (auth.uid()::text = sender_id::text OR true);
