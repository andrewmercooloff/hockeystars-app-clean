-- IANA timezone on players + last digest sent date (user-local YYYY-MM-DD).
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS notification_timezone text,
  ADD COLUMN IF NOT EXISTS profile_views_digest_sent_on date;

COMMENT ON COLUMN public.players.notification_timezone IS 'IANA TZ from client (e.g. Europe/Warsaw) for profile views digest scheduling';
COMMENT ON COLUMN public.players.profile_views_digest_sent_on IS 'User-local calendar date (YYYY-MM-DD) when the profile views digest push was last sent';
