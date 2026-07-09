-- FIX: quiz leaderboard (run in Supabase SQL Editor after hockey_star_quiz_scores exists)

-- 1) score must be bigint (prize * 1e9 overflows integer)
alter table public.hockey_star_quiz_scores
  alter column score type bigint using score::bigint;

-- 2) same insert policy as puck_game_scores
drop policy if exists "Authenticated users insert own quiz scores" on public.hockey_star_quiz_scores;
drop policy if exists "Anyone can insert quiz scores for valid player" on public.hockey_star_quiz_scores;
create policy "Anyone can insert quiz scores"
  on public.hockey_star_quiz_scores for insert
  with check (true);

-- 3) grants (without these anon inserts fail even with RLS policy)
grant select, insert on public.hockey_star_quiz_scores to anon;
grant select, insert on public.hockey_star_quiz_scores to authenticated;
grant all on public.hockey_star_quiz_scores to service_role;
