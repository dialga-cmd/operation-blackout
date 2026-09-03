-- Operation Blackout Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Rounds configuration
create table if not exists public.rounds (
  id serial primary key,
  number integer unique not null,
  title text not null,
  unlock_date timestamptz not null,
  is_active boolean default true,
  max_score integer default 1000
);

-- User progress tracking
create table if not exists public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  round_id integer references public.rounds(id),
  status text default 'locked' check (status in ('locked', 'available', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  score integer,
  unique(user_id, round_id)
);

-- Flag attempts
create table if not exists public.flag_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  round_id integer references public.rounds(id),
  flag text not null,
  submitted_at timestamptz default now(),
  correct boolean not null
);

-- User flag keys (for per-user dynamic flags)
create table if not exists public.user_flag_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  round_id integer references public.rounds(id),
  key text not null,
  day_date date not null,
  created_at timestamptz default now(),
  unique(user_id, round_id, day_date)
);

-- Cheat detection log
create table if not exists public.cheat_attempts (
  id uuid primary key default uuid_generate_v4(),
  submitter_id uuid references public.users(id) on delete cascade,
  owner_id uuid references public.users(id),
  flag text not null,
  round_id integer references public.rounds(id),
  detected_at timestamptz default now(),
  ip text,
  status text default 'flagged' check (status in ('banned', 'flagged'))
);

-- Timeline submissions (Round 3)
create table if not exists public.timeline_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  round_id integer references public.rounds(id),
  content text not null,
  submitted_at timestamptz default now()
);

-- Insert default rounds
insert into public.rounds (number, title, unlock_date, is_active, max_score)
values
  (1, 'The Point of Entry', '2026-01-14T00:00:00Z', true, 1000),
  (2, 'What They Tried to Hide', '2026-01-15T00:00:00Z', true, 1000),
  (3, 'The Last Trace', '2026-01-16T00:00:00Z', true, 1000)
on conflict (number) do nothing;

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.user_progress enable row level security;
alter table public.flag_attempts enable row level security;
alter table public.user_flag_keys enable row level security;
alter table public.cheat_attempts enable row level security;
alter table public.timeline_submissions enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can view own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

create policy "Users can view own attempts"
  on public.flag_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.flag_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can view own flag keys"
  on public.user_flag_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert own flag keys"
  on public.user_flag_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can view own cheat attempts"
  on public.cheat_attempts for select
  using (auth.uid() = submitter_id or auth.uid() = owner_id);

create policy "Users can insert cheat attempts"
  on public.cheat_attempts for insert
  with check (true);

create policy "Users can view own timelines"
  on public.timeline_submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert own timelines"
  on public.timeline_submissions for insert
  with check (auth.uid() = user_id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
