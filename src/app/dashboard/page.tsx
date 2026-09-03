import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Admin check logic:
  // 1. First check the `admins` table on Supabase (by user_id or email)
  // 2. Fallback to `users` table `role = 'admin'`
  // 3. Fallback to ADMIN_EMAILS env variable if table doesn't exist yet
  let isAdmin = false;

  try {
    const { data: adminRecord } = await adminSupabase
      .from("admins")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (adminRecord) {
      isAdmin = true;
    } else {
      const { data: userRoleRecord } = await adminSupabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (userRoleRecord?.role === "admin") {
        isAdmin = true;
      }
    }
  } catch {
    // If admins table is not yet migrated, check ADMIN_EMAILS env
  }

  if (!isAdmin) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    isAdmin = adminEmails.length === 0 || (user.email ? adminEmails.includes(user.email.toLowerCase()) : false);
  }

  if (!isAdmin) {
    redirect("/game");
  }

  // Fetch all registered users with roles (Admin / Participant)
  const { data: allUsers } = await adminSupabase
    .from("users")
    .select("id, email, name, role, created_at");

  // Fetch admins list from admins table if present
  const { data: adminTableList } = await adminSupabase
    .from("admins")
    .select("user_id, email");

  const adminSet = new Set<string>();
  (adminTableList || []).forEach((a) => {
    if (a.user_id) adminSet.add(a.user_id);
    if (a.email) adminSet.add(a.email.toLowerCase());
  });

  const formattedUsers = (allUsers || []).map((u) => {
    const userRole = u.role === "admin" || adminSet.has(u.id) || (u.email && adminSet.has(u.email.toLowerCase()))
      ? "admin"
      : "participant";
    return {
      ...u,
      role: userRole as "admin" | "participant",
    };
  });

  // Get all user progress
  const { data: allProgress } = await adminSupabase
    .from("user_progress")
    .select(`
      *,
      users:user_id (id, email, name),
      rounds:round_id (number, title)
    `)
    .order("round_id", { ascending: true });

  // Get all flag attempts
  const { data: allAttempts } = await adminSupabase
    .from("flag_attempts")
    .select(`
      *,
      users:user_id (email, name)
    `)
    .order("submitted_at", { ascending: false })
    .limit(100);

  // Get cheat attempts
  const { data: cheatAttempts } = await adminSupabase
    .from("cheat_attempts")
    .select("*")
    .order("detected_at", { ascending: false });

  // Get timeline submissions
  const { data: timelineSubmissions } = await adminSupabase
    .from("timeline_submissions")
    .select(`
      *,
      users:user_id (email, name)
    `)
    .order("submitted_at", { ascending: false });

  // Stats calculation
  const totalUsers = formattedUsers.length;

  const roundStats = [1, 2, 3].map((round) => {
    const roundProgress = allProgress?.filter(
      (p) => p.round_id === round
    ) || [];
    const completed = roundProgress.filter(
      (p) => p.status === "completed"
    ).length;
    const avgScore =
      roundProgress
        .filter((p) => p.score)
        .reduce((sum, p) => sum + (p.score || 0), 0) / (completed || 1);

    return {
      round,
      total: roundProgress.length,
      completed,
      avgScore: Math.round(avgScore),
    };
  });

  // Fetch rounds config for schedule controls
  const { data: roundsList } = await adminSupabase
    .from("rounds")
    .select("*")
    .order("number", { ascending: true });

  return (
    <DashboardClient
      totalUsers={totalUsers}
      allUsers={formattedUsers}
      roundsList={roundsList || []}
      roundStats={roundStats}
      allProgress={allProgress || []}
      allAttempts={allAttempts || []}
      cheatAttempts={cheatAttempts || []}
      timelineSubmissions={timelineSubmissions || []}
    />
  );
}
