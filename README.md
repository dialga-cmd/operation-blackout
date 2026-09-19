# OPERATION BLACKOUT
### Advanced Linux Forensics & Incident Response CTF Platform

**Operation Blackout** is a high-security, retro-pixel themed Capture-The-Flag (CTF) competition platform built on Next.js 15, TypeScript, and Supabase. Participants operate an in-browser virtualized Linux terminal to investigate system breach incidents, analyze obfuscated filesystems, extract encryptions, decode binary payloads, and track attacker footprints across 3 escalating rounds.

---

## Key Features & Architecture

### 1. **Realistic Terminal UX & Anti-Frustration System**
- **Continuous Auto-Focus:** Keeps input focused seamlessly so participants never have to click the terminal window repeatedly.
- **Unified Event Pipeline:** Resolves asynchronous output index collisions to prevent terminal state freezes.
- **Standard Linux Tooling:** Supports `cd`, `ls`, `cat`, `head`, `tail`, `grep`, `find`, `stat`, `file`, `strings`, `readlink`, `tar`, `gzip`, `xxd`, `base64`, `id`, `groups`, `sudo`, `history`, `clear`, and `help`.

### 2. **Dynamic Participant VFS Scrambling (Anti-Cheat Engine)**
- **Seed-Based Scrambling:** Puzzles and directory paths are dynamically generated per participant using a deterministic cryptographic seed (`userId` + `roundId`).
- **Path & Filename Randomization:** Flag paths (`/var/backups/.sys_cache_09`, `/var/tmp/.svc_state_44`, etc.) shift per user, invalidating prompt-pasting solutions to ChatGPT/Claude.
- **Flag-Sharing & Leak Prevention:** Flags are validated server-side. Submitting flags generated for another participant triggers automated flag-sharing audit logs.

### 3. **Organizer Dashboard (`/dashboard`)**
- **Database-Driven Admin Auth:** Checks the Supabase `admins` table & user roles (`admin` vs `participant`).
- **Round Unlock Scheduler:** Set custom unlock dates, times, and toggles (**ACTIVE** / **LOCKED**).
- **Participant Live Progress:** Monitor completed rounds, flag submission history, and cheat alerts in real time.

### 4. **Redis Leaderboard Cache**
- **Cache-First Reads:** `GET /api/leaderboard` (public) and the `/leaderboard` page serve the score leaderboard straight from Redis — during a traffic flood the database is never queried, only Redis.
- **Write-Only-On-Change:** Redis is updated **only when the database changes**: flag submissions, cheat/ban events, the manual **REFRESH REDIS CACHE** button in `/dashboard`, or the Supabase webhook all re-compute the snapshot (`leaderboard:score:v1`) and write it back. The snapshot has **no TTL** and is never re-warmed by reads — if nothing changed in the DB, Redis is never touched.
- **Admin Panel Reads the Database:** `GET /api/admin/leaderboard` renders directly from the database (always live), so organizers never see a stale snapshot.
- **Graceful Fallback:** Works with Upstash Redis REST (serverless-friendly, recommended for Vercel) or any generic Redis via `REDIS_URL`. If Redis is unreachable, reads fall back to the database; if it was never seeded, the dashboard button seeds it. Without a Redis configured, a per-process in-memory cache keeps the app fully functional (single instance only).

---

## ⚔️ Challenge Flow: Hard -> Harder -> Hardest

### **Round 1 (HARD): Log & Permission Forensics**
- **Objective:** Locate system breach entry traces.
- **Mechanics:** `find -newer` timestamp correlation, decoy file traps, case-sensitivity traps, and group permission checks (`svc-backup:backup`).

### **Round 2 (HARDER): Cron Persistence & 3-Part Encoded Flags**
- **Objective:** Trace backdoor scripts & persistence mechanisms.
- **Mechanics:** Inspect `/etc/cron.d/fake-job` and symlink targets (`/opt/scripts/monitor.sh`). Reassemble 3-part split flags (`auth_session.part1`, `part2`, `part3`) encoded across environment variables and ROT13/Base64 history logs.

### **Round 3 (HARDEST): Binary Analysis & Hex Memory Forensics**
- **Objective:** Extract attacker payloads and submit the flag.
- **Mechanics:** Detect magic-byte disguised files (`invoice.pdf` is actually a GZIP/TAR archive containing an ELF binary). Run `strings` or `xxd` to extract hex-encoded stash targets (`2f766172...`), perform elevated `sudo -l` inspections, and submit the final flag.

---

## 🛠️ Environment Setup & Configuration

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FLAG_KEY_SECRET=your-long-random-secret
ADMIN_EMAILS=admin@example.com

# Redis leaderboard cache (Vercel + Upstash — recommended):
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
# …or a generic Redis server via ioredis:
# REDIS_URL=redis://default:password@host:6379
```

### Vercel + Upstash Redis (free)

1. Create a free Upstash Redis database at [upstash.com](https://upstash.com) (free tier: 256 MB, 10k commands/day — plenty for this app). Pick the region closest to your Supabase project.
2. In your Upstash console open **REST API** and copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.
3. Either click the **Connect to Vercel** button in Upstash (adds the env vars automatically), or paste them into **Vercel → Project → Settings → Environment Variables** and redeploy.
4. The REST backend is used automatically — no code changes needed.

> No `REDIS_URL` needed when using Upstash REST. If neither is set, the app runs on the in-memory fallback.

### Automatic cache refresh (Supabase webhook)

The Redis cache is refreshed automatically the moment leaderboard data changes, so players never see stale scores. Set this up once:

1. Add a `CACHE_WEBHOOK_SECRET` env var on Vercel (`openssl rand -hex 24`) **and** in `.env.local`.
2. Enable the HTTP extension and create the trigger in the **Supabase SQL editor** (replace the `url`/secret literally):

```sql
create extension if not exists pg_net;

create or replace function public.notify_leaderboard_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status in ('completed', 'locked')) then
    perform net.http_post(
      url := 'https://your-app.vercel.app/api/leaderboard/refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'REPLACE_WITH_YOUR_CACHE_WEBHOOK_SECRET'
      ),
      body := '{}',
      timeout_milliseconds := 5000
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_progress_complete_refresh on public.user_progress;
create trigger on_progress_complete_refresh
  after insert or update on public.user_progress
  for each row execute function public.notify_leaderboard_refresh();
```

Now every completed round (or ban) inserts/updates `user_progress`, the trigger fires the webhook, and the cache is re-written from the database instantly. The endpoint is deliberately unauthenticated-gated (Supabase has no user cookie) but verifies the `x-webhook-secret` header, so only your own trigger can invoke it.

### Database Schema Requirements (Supabase SQL)

Run the following queries in your Supabase SQL editor:

```sql
-- Admins table for dynamic dashboard gating
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rounds table for scheduling
CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  number INT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  unlock_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

INSERT INTO rounds (number, title, is_active) VALUES
(1, 'System Reconnaissance', true),
(2, 'Persistence & Encoding', true),
(3, 'Binary Forensics', true)
ON CONFLICT (number) DO NOTHING;
```

---

## 🚀 Hosting on Render (Deployment Guide)

### Option A: Render Blueprint (Recommended)
1. Push this repository to GitHub/GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect your repository. Render will automatically read `render.yaml`.
5. Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAILS`
6. Click **Apply**.

### Option B: Node.js Web Service Manual Setup
1. Create a **New Web Service** on Render.
2. Select **Node** environment.
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm start`
5. Add environment variables under **Environment** tab.

### Option C: Docker Container Deployment
Render will automatically detect the included multi-stage `Dockerfile`. Select **Docker** as the environment and deploy.

---

## Local Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```
