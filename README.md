# OPERATION BLACKOUT 🚀
### Advanced Linux Forensics & Incident Response CTF Platform

**Operation Blackout** is a high-security, retro-pixel themed Capture-The-Flag (CTF) competition platform built on Next.js 15, TypeScript, and Supabase. Participants operate an in-browser virtualized Linux terminal to investigate system breach incidents, analyze obfuscated filesystems, extract encryptions, decode binary payloads, and track attacker footprints across 3 escalating rounds.

---

## 🌟 Key Features & Architecture

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
- **Participant Live Progress:** Monitor completed rounds, flag submission history, timeline reports, and cheat alerts in real time.

---

## ⚔️ Challenge Flow: Hard -> Harder -> Hardest

### **Round 1 (HARD): Log & Permission Forensics**
- **Objective:** Locate system breach entry traces.
- **Mechanics:** `find -newer` timestamp correlation, decoy file traps, case-sensitivity traps, and group permission checks (`svc-backup:backup`).

### **Round 2 (HARDER): Cron Persistence & 3-Part Encoded Flags**
- **Objective:** Trace backdoor scripts & persistence mechanisms.
- **Mechanics:** Inspect `/etc/cron.d/fake-job` and symlink targets (`/opt/scripts/monitor.sh`). Reassemble 3-part split flags (`auth_session.part1`, `part2`, `part3`) encoded across environment variables and ROT13/Base64 history logs.

### **Round 3 (HARDEST): Binary Analysis & Hex Memory Forensics**
- **Objective:** Extract attacker payloads and submit an incident report.
- **Mechanics:** Detect magic-byte disguised files (`invoice.pdf` is actually a GZIP/TAR archive containing an ELF binary). Run `strings` or `xxd` to extract hex-encoded stash targets (`2f766172...`), perform elevated `sudo -l` inspections, and submit the required incident report via `timeline`.

---

## 🛠️ Environment Setup & Configuration

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=admin@example.com
```

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

## 📜 Local Development

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
