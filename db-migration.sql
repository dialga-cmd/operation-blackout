-- ============================================================================
-- Operation Blackout — Live DB migration for anti-cheat hardening
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query)
-- against your project. The changes are idempotent (safe to re-run).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Block self-forged progress / score (players could mark rounds complete
--    and set their own score via the anon client before this fix).
-- ----------------------------------------------------------------------------
drop policy if exists "Users can insert own progress" on public.user_progress;
drop policy if exists "Users can update own progress" on public.user_progress;

-- ----------------------------------------------------------------------------
-- 2) Block flag-attempt spam (players could inject fake attempt history).
-- ----------------------------------------------------------------------------
drop policy if exists "Users can insert own attempts" on public.flag_attempts;

-- ----------------------------------------------------------------------------
-- 3) Harden cheat-attempt inserts: previously `with check (true)` let a player
--    create cheat rows with ANOTHER user's submitter_id (framing / banning).
--    Now a user can only report themselves (the server inserts on their behalf).
-- ----------------------------------------------------------------------------
drop policy if exists "Users can insert cheat attempts" on public.cheat_attempts;
create policy "Users can insert own cheat attempts"
  on public.cheat_attempts for insert
  with check (auth.uid() = submitter_id);

-- ----------------------------------------------------------------------------
-- 4) Remove the dead `user_flag_keys` table (never written by app code, but its
--    RLS policies let users read/insert per-user flag keys — a latent leak).
-- ----------------------------------------------------------------------------
drop policy if exists "Users can view own flag keys" on public.user_flag_keys;
drop policy if exists "Users can insert own flag keys" on public.user_flag_keys;
alter table public.user_flag_keys disable row level security;
drop table if exists public.user_flag_keys;

-- ----------------------------------------------------------------------------
-- Verify the result (should return 4 rows: the read policies + the one
-- new cheat-insert policy — no insert/update progress or insert attempts).
-- ----------------------------------------------------------------------------
-- select tablename, policyname
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;