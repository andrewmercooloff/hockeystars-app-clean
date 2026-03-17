-- Add game_videos column for AI analysis YouTube video links
ALTER TABLE players ADD COLUMN IF NOT EXISTS game_videos TEXT DEFAULT NULL;

-- This stores a JSON array of YouTube URLs that players add for AI scout analysis
-- Example: '["https://youtube.com/watch?v=abc123", "https://youtu.be/xyz456"]'
-- The Edge Function reads these URLs and passes them to Gemini as multimodal video input
-- Gemini 2.5 Flash actually WATCHES the videos when generating the player analysis
