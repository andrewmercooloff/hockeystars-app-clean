-- =============================================================================
-- Fix increment_profile_views: SECURITY DEFINER to bypass RLS
-- Run in Supabase SQL Editor
-- =============================================================================

-- 1. Ensure columns exist
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS profile_views_total  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_views_today  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_views_reset_at DATE DEFAULT CURRENT_DATE;

-- 2. Initialize NULLs
UPDATE public.players
SET
  profile_views_total    = COALESCE(profile_views_total, 0),
  profile_views_today    = COALESCE(profile_views_today, 0),
  profile_views_reset_at = COALESCE(profile_views_reset_at, CURRENT_DATE)
WHERE profile_views_total IS NULL
   OR profile_views_today IS NULL
   OR profile_views_reset_at IS NULL;

-- 3. Drop old function
DROP FUNCTION IF EXISTS public.increment_profile_views(UUID);

-- 4. Recreate with SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_profile_views(profile_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE players
  SET
    profile_views_total = COALESCE(profile_views_total, 0) + 1,
    profile_views_today = CASE
      WHEN COALESCE(profile_views_reset_at, CURRENT_DATE) < CURRENT_DATE
        THEN 1
        ELSE COALESCE(profile_views_today, 0) + 1
    END,
    profile_views_reset_at = CURRENT_DATE
  WHERE id = profile_player_id;
END;
$$;

-- 5. Grant execute to all roles
GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO service_role;
