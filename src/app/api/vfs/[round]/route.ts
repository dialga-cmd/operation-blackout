import { NextResponse } from "next/server";
import { generateFlagKey, getTodayDate } from "@/lib/crypto/flag-key";
import { roundVFSMap } from "@/data/rounds";
import { randomizeRoundVFS } from "@/lib/vfs/randomizer";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getCachedVFS, setCachedVFS } from "@/lib/vfs-cache";
import type { VFSRound, VFSNode } from "@/lib/types";

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

  const rl = checkRateLimit(`vfs:${userId}`, RATE_LIMITS.vfsFetch);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.` },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
  }

  const { data: banCheck } = await supabase
    .from("cheat_attempts")
    .select("status")
    .eq("submitter_id", userId)
    .eq("status", "banned")
    .maybeSingle();

  if (banCheck) {
    return NextResponse.json(
      { error: "BANNED: Your account has been suspended for policy violation." },
      { status: 403 }
    );
  }

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

  const { data: roundConfig } = await supabase
    .from("rounds")
    .select("is_active, unlock_date")
    .eq("number", roundId)
    .single();

  if (!roundConfig) {
    return NextResponse.json({ error: "Invalid round" }, { status: 404 });
  }

  const unlocked =
    !!roundConfig.is_active &&
    new Date(roundConfig.unlock_date).getTime() <= Date.now();
  if (!unlocked) {
    return NextResponse.json({ error: "Round locked" }, { status: 403 });
  }

  const roundData = roundVFSMap[roundId];
  if (!roundData) {
    return NextResponse.json({ error: "Invalid round" }, { status: 404 });
  }

  const todayDate = getTodayDate();

  const cached = getCachedVFS(userId, roundId, todayDate);
  if (cached) {
    return NextResponse.json(sanitizeVFSForClient(cached));
  }

  const flagKey = generateFlagKey(userId, roundId, todayDate);
  const personalizedRound = randomizeRoundVFS(roundData, userId, flagKey);

  setCachedVFS(userId, roundId, todayDate, personalizedRound);

  return NextResponse.json(sanitizeVFSForClient(personalizedRound));
}

type SanitizableNode = Partial<VFSNode> & {
  archiveContents?: SanitizableNode[];
};

// Remove real flag content before it reaches the browser. The client never
// displays a solution flag directly — the terminal resolves a marker through
// the gated /api/vfs/content endpoint instead.
function sanitizeVFSForClient(round: VFSRound): VFSRound {
  const strip = (node: VFSNode): VFSNode => {
    const next: SanitizableNode = { ...node };
    if (next.isSolutionFlag) {
      next.content = "";
      next.readableStrings = undefined;
      next.archiveContents = undefined;
    } else if (Array.isArray(next.archiveContents)) {
      next.archiveContents = next.archiveContents.map(strip);
    }
    return next as VFSNode;
  };

  const cleaned = { ...round };
  if (Array.isArray(cleaned.nodes)) {
    cleaned.nodes = cleaned.nodes.map(strip);
  }
  return cleaned;
}
