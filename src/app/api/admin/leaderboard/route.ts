import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

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
      console.error("Failed to fetch leaderboard progress:", progressResult.error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data" },
        { status: 500 }
      );
    }

    const bannedIds = new Set<string>();
    (cheatResult.data || []).forEach((c) => {
      bannedIds.add(c.submitter_id);
      bannedIds.add(c.owner_id);
    });

    const rows = (progressResult.data || [])
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
          new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime()
      );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("Admin leaderboard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}