import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScoreLeaderboard } from "@/lib/score-leaderboard";
import { LeaderboardClient } from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const formattedScoreLeaderboard = await getScoreLeaderboard();

  return <LeaderboardClient initialData={formattedScoreLeaderboard} />;
}