-- Leads from album.hockey-stars.com order form.
-- Run in Supabase SQL editor (Dashboard → SQL).

CREATE TABLE IF NOT EXISTS public.album_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  club text NOT NULL,
  message text,
  source text NOT NULL DEFAULT 'album.hockey-stars.com',
  ip text,
  user_agent text,
  email_sent boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS album_leads_created_at_idx ON public.album_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS album_leads_email_idx ON public.album_leads (email);

ALTER TABLE public.album_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "album_leads_anon_insert" ON public.album_leads;
CREATE POLICY "album_leads_anon_insert"
  ON public.album_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Reads only for authenticated admins (adjust if you use a service role from PHP instead).
DROP POLICY IF EXISTS "album_leads_admin_select" ON public.album_leads;
CREATE POLICY "album_leads_admin_select"
  ON public.album_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = auth.uid()::text AND p.status = 'admin'
    )
  );

COMMENT ON TABLE public.album_leads IS 'Order / sample requests from album.hockey-stars.com';
