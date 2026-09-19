import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  queryScoreLeaderboard,
  refreshScoreLeaderboard,
  getLeaderboardCacheInfo,
} from "@/lib/score-leaderboard";

async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const adminSupabase = createAdminClient();

  let isAdmin = false;
  try {
    const { data: adminRecord } = await adminSupabase
      .from("admins")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (adminRecord) isAdmin = true;
  } catch {}

  if (!isAdmin) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.length > 0 && user.email) {
      isAdmin = adminEmails.includes(user.email.toLowerCase());
    }
  }

  return isAdmin;
}

export async function GET() {
  try {
    const rl = checkRateLimit("admin:leaderboard", {
      windowMs: 60_000,
      maxRequests: 300,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    if (!(await isAdminUser())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // The admin panel always renders live data straight from the database —
    // it never reads the Redis cache. Include cache health for transparency.
    const [rows, cache] = await Promise.all([
      queryScoreLeaderboard(),
      getLeaderboardCacheInfo(),
    ]);

    return NextResponse.json({
      success: true,
      source: "database",
      data: rows,
      cache,
    });
  } catch (err) {
    console.error("Admin leaderboard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const rl = checkRateLimit("admin:leaderboard:refresh", {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    if (!(await isAdminUser())) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Manual "update Redis now" action: recompute from the DB and write the
    // cache, then report exactly what happened.
    const result = await refreshScoreLeaderboard();

    if (!result.dbQuerySucceeded) {
      return NextResponse.json(
        { success: false, error: "Failed to read leaderboard from database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "refresh_completed",
      rows: result.rows.length,
      data: result.rows,
      cache: result.cache,
    });
  } catch (err) {
    console.error("Admin leaderboard refresh error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}