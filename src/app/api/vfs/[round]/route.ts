import { NextResponse } from "next/server";
import { generateFlagKey, getTodayDate } from "@/lib/crypto/flag-key";
import { roundVFSMap } from "@/data/rounds";
import { randomizeRoundVFS } from "@/lib/vfs/randomizer";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ round: string }> }
) {
  const { round } = await params;
  const roundId = parseInt(round, 10);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Security Check: Verify authenticated session matches requested userId
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  // Security Check: Verify round is unlocked for this user
  if (roundId > 1) {
    const { data: prevProgress } = await supabase
      .from("user_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("round_id", roundId - 1)
      .single();

    if (!prevProgress || prevProgress.status !== "completed") {
      return NextResponse.json({ error: "Round locked" }, { status: 403 });
    }
  }

  const roundData = roundVFSMap[roundId];
  if (!roundData) {
    return NextResponse.json({ error: "Invalid round" }, { status: 404 });
  }

  // Generate user-specific flag key
  const todayDate = getTodayDate();
  const flagKey = generateFlagKey(userId, roundId, todayDate);

  const personalizedRound = randomizeRoundVFS(roundData, userId, flagKey);

  return NextResponse.json(personalizedRound);
}
