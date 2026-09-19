import { createAdminClient } from "@/lib/supabase/admin";
import {
  redisGet,
  redisSet,
  redisDel,
  isRedisConfigured,
  redisPing,
} from "@/lib/redis";

export interface ScoreLeaderboardRow {
  user_id: string;
  round_id: number;
  status: string;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  users?: { email: string; name: string };
}

interface ProgressQueryRow {
  user_id: string;
  round_id: number;
  status: string;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  users:
    | Array<{ email: string | null; name: string | null }>
    | { email: string | null; name: string | null }
    | null;
}

const LEADERBOARD_KEY = "leaderboard:score:v1";
const LEADERBOARD_TTL_SECONDS: number | null = null;

let inflightRefresh: Promise<ScoreLeaderboardRow[]> | null = null;

export async function queryScoreLeaderboard(): Promise<ScoreLeaderboardRow[]> {
  const adminSupabase = createAdminClient();

  const [progressResult, cheatResult] = await Promise.all([
    adminSupabase
      .from("user_progress")
      .select(`
        user_id,
        round_id,
        status,
        score,
        started_at,
        completed_at,
        users:user_id (id, email, name)
      `)
      .in("round_id", [1, 2, 3])
      .eq("status", "completed"),
    adminSupabase.from("cheat_attempts").select("submitter_id, owner_id"),
  ]);

  if (progressResult.error) {
    throw progressResult.error;
  }

  const bannedIds = new Set<string>();
  (cheatResult.data || []).forEach((c) => {
    bannedIds.add(c.submitter_id);
    bannedIds.add(c.owner_id);
  });

  return ((progressResult.data as ProgressQueryRow[] | null) || [])
    .filter((p) => !bannedIds.has(p.user_id))
    .map((p) => {
      const userInfo = Array.isArray(p.users) ? p.users[0] : p.users;
      return {
        user_id: p.user_id,
        round_id: p.round_id,
        status: p.status,
        score: p.score,
        started_at: p.started_at,
        completed_at: p.completed_at,
        users: userInfo
          ? {
              email: userInfo.email || "",
              name: userInfo.name || "",
            }
          : undefined,
      };
    })
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) ||
        new Date(a.completed_at || 0).getTime() -
          new Date(b.completed_at || 0).getTime()
    );
}

export interface LeaderboardCacheInfo {
  configured: boolean;
  online: boolean;
  cachedRows: number | null;
  ttlSeconds: number | null;
}

export async function getLeaderboardCacheInfo(): Promise<LeaderboardCacheInfo> {
  const [cached, online] = await Promise.all([
    redisGet<ScoreLeaderboardRow[]>(LEADERBOARD_KEY).catch(() => null),
    redisPing(),
  ]);
  return {
    configured: isRedisConfigured(),
    online,
    cachedRows: Array.isArray(cached) ? cached.length : null,
    // null = cached snapshot persists until the next database change refreshes it.
    ttlSeconds: LEADERBOARD_TTL_SECONDS,
  };
}

export async function getScoreLeaderboard(): Promise<ScoreLeaderboardRow[]> {
  const cached = await redisGet<ScoreLeaderboardRow[]>(LEADERBOARD_KEY).catch(
    () => null
  );
  if (cached) return cached;

  // Cache miss (never seeded, evicted, or Redis down) → serve the database
  // directly. Reads NEVER write the cache: the snapshot is updated only when
  // the DB itself changes (flag submission, cheat/ban, manual admin refresh,
  // or the Supabase webhook).

  // Thundering-herd guard: coalesce concurrent misses so a cold-start burst
  // issues a single database query instead of one per request.
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      return await queryScoreLeaderboard();
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

export interface RefreshLeaderboardResult {
  rows: ScoreLeaderboardRow[];
  dbQuerySucceeded: boolean;
  cache: LeaderboardCacheInfo;
}

export async function refreshScoreLeaderboard(): Promise<RefreshLeaderboardResult> {
  try {
    const rows = await queryScoreLeaderboard();

    // Best-effort write (no TTL): the snapshot persists until the next
    // database change refreshes it. If Redis is down the next read simply
    // misses the cache and serves fresh data from the database again.
    await redisSet(LEADERBOARD_KEY, rows).catch(() => {});

    return {
      rows,
      dbQuerySucceeded: true,
      cache: await getLeaderboardCacheInfo(),
    };
  } catch {
    // The database query itself failed — drop whatever stale snapshot is in
    // Redis so the next read doesn't serve outdated placements.
    await invalidateScoreLeaderboard();
    return {
      rows: [],
      dbQuerySucceeded: false,
      cache: await getLeaderboardCacheInfo(),
    };
  }
}

export async function invalidateScoreLeaderboard(): Promise<void> {
  try {
    await redisDel(LEADERBOARD_KEY);
  } catch {}
}