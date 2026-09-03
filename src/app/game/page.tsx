import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GameClient } from "./GameClient";

export default async function GamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Get user progress
  const { data: progress } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .order("round_id", { ascending: true });

  // Get current available round
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("is_active", true)
    .order("number", { ascending: true });

  // Determine current round
  let currentRound = 1;
  if (progress && progress.length > 0) {
    const completedRounds = progress
      .filter((p) => p.status === "completed")
      .map((p) => p.round_id);

    // Find the next available round
    for (const round of rounds || []) {
      if (!completedRounds.includes(round.number)) {
        currentRound = round.number;
        break;
      }
    }

    // If all rounds completed
    if (completedRounds.length === (rounds?.length || 3)) {
      currentRound = 3; // Stay on last round
    }
  }

  // Check if round is unlocked
  let nextRoundUnlockDate: string | null = null;
  const currentRoundData = rounds?.find((r) => r.number === currentRound);
  if (currentRoundData) {
    const unlockDate = new Date(currentRoundData.unlock_date);
    if (unlockDate > new Date() || currentRoundData.is_active === false) {
      // Round not yet unlocked
      nextRoundUnlockDate = currentRoundData.unlock_date;
      currentRound = 0;
    }
  }

  // Mark round as in_progress if not completed
  if (currentRound > 0) {
    const existingProgress = progress?.find(
      (p) => p.round_id === currentRound
    );

    if (!existingProgress) {
      await supabase.from("user_progress").insert({
        user_id: user.id,
        round_id: currentRound,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    } else if (existingProgress.status === "available") {
      await supabase
        .from("user_progress")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id);
    }
  }

  return (
    <GameClient
      userId={user.id}
      currentRound={currentRound}
      nextRoundUnlockDate={nextRoundUnlockDate}
      progress={progress || []}
      rounds={rounds || []}
    />
  );
}
