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

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  // Check the admins table first, then the explicit environment allowlist.
  let isAdmin = false;

  try {
    const { data: adminRecord } = await adminSupabase
      .from("admins")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (adminRecord) {
      isAdmin = true;
    }
  } catch {
    // If admins table is not migrated, use the environment allowlist.
  }

  if (!isAdmin && user.email) {
    isAdmin = adminEmails.includes(user.email.toLowerCase());
  }

  if (!isAdmin) {
    redirect("/game");
  }

  // Fetch all registered users with roles (Admin / Participant)
  const { data: allUsers, error: usersError } = await adminSupabase
    .from("users")
    .select("id, email, name, created_at");
  if (usersError) {
    console.error("Failed to fetch dashboard users:", usersError);
  }

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
    const userRole = adminSet.has(u.id) ||
      (u.email && (adminSet.has(u.email.toLowerCase()) || adminEmails.includes(u.email.toLowerCase())))
      ? "admin"
      : "participant";
    return {
      ...u,
      role: userRole as "admin" | "participant",
    };
  });

  // Get all user progress
  const { data: allProgress, error: progressError } = await adminSupabase
    .from("user_progress")
    .select(`
      *,
      users:user_id (id, email, name),
      rounds:round_id (number, title)
    `)
    .order("round_id", { ascending: true });
  if (progressError) {
    console.error("Failed to fetch dashboard progress:", progressError);
  }

  const formattedProgress = (allProgress || []).map((progress) => ({
    user_id: progress.user_id,
    round_id: progress.round_id,
    status: progress.status,
    score: progress.score,
    started_at: progress.started_at,
    completed_at: progress.completed_at,
    users: progress.users
      ? {
          email: progress.users.email || "",
          name: progress.users.name || "",
        }
      : undefined,
    rounds: progress.rounds
      ? {
          number: progress.rounds.number,
          title: progress.rounds.title || "",
        }
      : undefined,
  }));

  // Get all flag attempts
  const { data: allAttempts, error: attemptsError } = await adminSupabase
    .from("flag_attempts")
    .select(`
      *,
      users:user_id (email, name)
    `)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (attemptsError) {
    console.error("Failed to fetch dashboard flag attempts:", attemptsError);
  }

  const formattedAttempts = (allAttempts || []).map((attempt) => ({
    id: attempt.id,
    flag: attempt.flag,
    correct: attempt.correct,
    submitted_at: attempt.submitted_at,
    round_id: attempt.round_id,
    users: attempt.users
      ? {
          email: attempt.users.email || "",
          name: attempt.users.name || "",
        }
      : undefined,
  }));

  // Get cheat attempts
  const { data: cheatAttempts, error: cheatAttemptsError } = await adminSupabase
    .from("cheat_attempts")
    .select("*")
    .order("detected_at", { ascending: false });
  if (cheatAttemptsError) {
    console.error("Failed to fetch dashboard cheat attempts:", cheatAttemptsError);
  }

  // Stats calculation
  const totalUsers = formattedUsers.length;

  const roundStats = [1, 2, 3].map((round) => {
    const roundProgress = formattedProgress.filter(
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
  const { data: roundsList, error: roundsError } = await adminSupabase
    .from("rounds")
    .select("*")
    .order("number", { ascending: true });
  if (roundsError) {
    console.error("Failed to fetch dashboard rounds:", roundsError);
  }

  // Fetch correct flag submissions for leaderboard
  const { data: correctFlags, error: correctFlagsError } = await adminSupabase
    .from("flag_attempts")
    .select(`
      *,
      users:user_id (email, name)
    `)
    .eq("correct", true)
    .order("submitted_at", { ascending: true });
    
  if (correctFlagsError) {
    console.error("Failed to fetch correct flags:", correctFlagsError);
  }

  // Filter out banned users
  const bannedUserIds = new Set<string>();
  (cheatAttempts || []).forEach(c => {
    bannedUserIds.add(c.submitter_id);
    bannedUserIds.add(c.owner_id);
  });

  const formattedLeaderboard = (correctFlags || [])
    .filter(a => !bannedUserIds.has(a.user_id))
    .map((a) => ({
      id: a.id,
      flag: a.flag,
      round_id: a.round_id,
      submitted_at: a.submitted_at,
      user_id: a.user_id,
      users: a.users
        ? {
            email: a.users.email || "",
            name: a.users.name || "",
          }
        : undefined,
    }));

  return (
    <DashboardClient
      totalUsers={totalUsers}
      allUsers={formattedUsers}
      roundsList={roundsList || []}
      roundStats={roundStats}
      allProgress={formattedProgress}
      allAttempts={formattedAttempts}
      cheatAttempts={cheatAttempts || []}
      leaderboardData={formattedLeaderboard}
    />
  );
}
