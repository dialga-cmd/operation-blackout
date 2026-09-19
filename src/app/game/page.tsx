import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { GameClient } from "./GameClient";
import { DaySelectionClient } from "./DaySelectionClient";

export default async function GamePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
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
    .order("number", { ascending: true });

  const params = await searchParams;
  const dayParam = params?.day;

  if (!dayParam) {
    return <DaySelectionClient progress={progress || []} rounds={rounds || []} />;
  }

  let currentRound = parseInt(dayParam, 10);
  
  if (![1, 2, 3].includes(currentRound)) {
    redirect("/game");
  }
  
  const completedRounds = (progress || [])
    .filter((p) => p.status === "completed")
    .map((p) => p.round_id);

  const isCompleted = completedRounds.includes(currentRound);
  const isPrevCompleted = currentRound === 1 || completedRounds.includes(currentRound - 1);
  const roundData = rounds?.find(r => r.number === currentRound);
  // eslint-disable-next-line react-hooks/purity
  const isUnlockedTime = roundData?.is_active && new Date(roundData.unlock_date).getTime() <= Date.now();

  if (!isCompleted && (!isPrevCompleted || !isUnlockedTime)) {
    redirect("/game");
  }

  let nextRoundUnlockDate: string | null = null;
  const currentRoundData = rounds?.find((r) => r.number === currentRound);
  if (currentRoundData) {
    const unlockDate = new Date(currentRoundData.unlock_date);
    if (unlockDate > new Date() || currentRoundData.is_active === false) {
      if (!isCompleted) {
        nextRoundUnlockDate = currentRoundData.unlock_date;
        currentRound = 0;
      }
    }
  }

  if (currentRound > 0 && !isCompleted) {
    const existingProgress = progress?.find(
      (p) => p.round_id === currentRound
    );

    if (!existingProgress) {
      await adminSupabase.from("user_progress").insert({
        user_id: user.id,
        round_id: currentRound,
        status: "in_progress",
        started_at: new Date().toISOString(),
      });
    } else if (existingProgress.status === "available") {
      await adminSupabase
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
