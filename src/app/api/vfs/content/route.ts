import { NextResponse } from "next/server";
import { generateFlagKey, getTodayDate } from "@/lib/crypto/flag-key";
import { roundVFSMap } from "@/data/rounds";
import { randomizeRoundVFS } from "@/lib/vfs/randomizer";
import { VFSEngine } from "@/lib/vfs/engine";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getCachedVFS, setCachedVFS } from "@/lib/vfs-cache";

// Returns the real content of a solution flag file, but ONLY to the account
// that legitimately owns the round and passes the same permission model the
// in-terminal `cat` command enforces. The goal: keep the flag out of the bulk
// VFS payload while preserving the intended "read the file" solve path.
export async function POST(request: Request) {
  try {
    const { roundId, path } = await request.json();

    if (!roundId || !path) {
      return NextResponse.json({ error: "Missing roundId or path" }, { status: 400 });
    }

    const rl = checkRateLimit(`vfsContent:${path}`, RATE_LIMITS.vfsFetch);
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

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

    let vfs: VFSEngine;
    const cached = getCachedVFS(userId, roundId, todayDate);
    if (cached) {
      vfs = new VFSEngine(cached);
    } else {
      const flagKey = generateFlagKey(userId, roundId, todayDate);
      const personalized = randomizeRoundVFS(roundData, userId, flagKey);
      setCachedVFS(userId, roundId, todayDate, personalized);
      vfs = new VFSEngine(personalized);
    }

    const node = vfs.getNode(path);
    if (!node || node.type !== "file" || !node.isSolutionFlag) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Mirror the terminal's permission model for `cat`: as a participant, or
    // elevated (round 3 `sudo cat` runs as svc-unknown).
    const participantReadable = vfs.canRead(
      node,
      "participant",
      ["participant", "backup"]
    );
    const elevatedReadable =
      roundId === 3 &&
      vfs.canRead(node, "svc-unknown", ["svc-unknown", "svc-backup", "shadow"]);

    if (!participantReadable && !elevatedReadable) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    return NextResponse.json({ content: node.content || "" });
  } catch (error) {
    console.error("VFS content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}