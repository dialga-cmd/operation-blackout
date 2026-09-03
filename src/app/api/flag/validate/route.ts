import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTodayDate } from "@/lib/crypto/flag-key";
import { buildExpectedFlag, DECOY_FLAGS } from "@/lib/server/flag-answer";

const admin = createAdminClient();

export async function POST(request: Request) {
  try {
    const { flag, roundId, userId } = await request.json();

    if (!flag || !roundId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // Security Check: Verify authenticated session matches requested userId
    const authClient = await createClient();
    const { data: { user: sessionUser } } = await authClient.auth.getUser();

    if (!sessionUser || sessionUser.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized flag submission." },
        { status: 403 }
      );
    }

    // Admin client bypasses RLS for cross-user operations (bans, monitoring).
    const supabase = admin;

    // Check if user is banned
    const { data: banCheck } = await supabase
      .from("cheat_attempts")
      .select("status")
      .eq("submitter_id", userId)
      .eq("status", "banned")
      .single();

    if (banCheck) {
      return NextResponse.json(
        {
          success: false,
          message:
            "ACCESS DENIED: Your account has been suspended for policy violation.",
        },
        { status: 403 }
      );
    }

    // Anti-brute-force: cooldown + attempt cap
    const { data: recentAttempts } = await supabase
      .from("flag_attempts")
      .select("submitted_at, correct")
      .eq("user_id", userId)
      .eq("round_id", roundId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    const now = Date.now();
    if (recentAttempts && recentAttempts.length > 0) {
      const lastAttempt = new Date(
        recentAttempts[0].submitted_at
      ).getTime();
      const cooldownMs = 30 * 1000; // 30 second cooldown
      const elapsed = now - lastAttempt;
      if (elapsed < cooldownMs && !recentAttempts[0].correct) {
        const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        return NextResponse.json({
          success: false,
          message: `Too many attempts. Please wait ${waitSeconds}s before trying again.`,
        });
      }
      // Cap: max 20 attempts per round, further attempts blocked
      if (recentAttempts.length >= 20) {
        const allWrong = recentAttempts.every((a) => !a.correct);
        if (allWrong && now - lastAttempt < 10 * 60 * 1000) {
          return NextResponse.json({
            success: false,
            message:
              "Attempt limit reached. Flag attempts are temporarily disabled for this round.",
          });
        }
      }
    }

    // Check for decoy flags first
    if (DECOY_FLAGS.includes(flag)) {
      await supabase.from("flag_attempts").insert({
        user_id: userId,
        round_id: roundId,
        flag,
        correct: false,
      });

      return NextResponse.json({
        success: false,
        message: "INCORRECT: That flag is a decoy. Keep investigating.",
      });
    }

    const todayDate = getTodayDate();
    const expectedFlag = buildExpectedFlag(roundId, userId, todayDate);

    if (!expectedFlag) {
      return NextResponse.json(
        { success: false, message: "Invalid round." },
        { status: 400 }
      );
    }

    // If the flag doesn't match this user's expected flag,
    // check whether it matches ANOTHER user's flag (cheating detection).
    if (flag !== expectedFlag) {
      await supabase.from("flag_attempts").insert({
        user_id: userId,
        round_id: roundId,
        flag,
        correct: false,
      });

      // Check if this exact flag belongs to another participant today
      const { data: allParticipants } = await supabase
        .from("users")
        .select("id");

      const sharedFlagUser = (allParticipants || []).find((u) => {
        if (u.id === userId) return false;
        return (
          buildExpectedFlag(roundId, u.id, todayDate) === flag
        );
      });

      if (sharedFlagUser) {
        // CHEATING DETECTED - flag sharing
        await supabase.from("cheat_attempts").insert([
          {
            submitter_id: userId,
            owner_id: sharedFlagUser.id,
            flag,
            round_id: roundId,
            status: "banned",
          },
          {
            submitter_id: sharedFlagUser.id,
            owner_id: userId,
            flag: "(flag sharing detected)",
            round_id: roundId,
            status: "banned",
          },
        ]);

        await supabase
          .from("user_progress")
          .update({ status: "locked" })
          .eq("user_id", userId)
          .eq("round_id", roundId);

        await supabase
          .from("user_progress")
          .update({ status: "locked" })
          .eq("user_id", sharedFlagUser.id)
          .eq("round_id", roundId);

        return NextResponse.json({
          success: false,
          message:
            "POLICY VIOLATION: This flag belongs to another participant. Both accounts have been flagged for review.",
        });
      }

      return NextResponse.json({
        success: false,
        message: "INCORRECT: That flag is not valid for your session. Keep investigating.",
      });
    }

    // Flag matches! Mark as completed.
    const { data: progress } = await supabase
      .from("user_progress")
      .select("id, started_at")
      .eq("user_id", userId)
      .eq("round_id", roundId)
      .single();

    if (progress) {
      const startedAt = new Date(progress.started_at || new Date());
      const completedAt = new Date();
      const timeDiff = Math.max(
        0,
        Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
      );

      // Score: max_points - time_penalty (faster = higher score)
      const maxScore = 1000;
      const score = Math.max(100, maxScore - Math.floor(timeDiff / 10));

      await supabase
        .from("user_progress")
        .update({
          status: "completed",
          completed_at: completedAt.toISOString(),
          score,
        })
        .eq("id", progress.id);

      await supabase.from("flag_attempts").insert({
        user_id: userId,
        round_id: roundId,
        flag,
        correct: true,
      });

      // Make next round available
      const nextRound = roundId + 1;
      if (nextRound <= 3) {
        const { data: existingNext } = await supabase
          .from("user_progress")
          .select("id")
          .eq("user_id", userId)
          .eq("round_id", nextRound)
          .single();

        if (!existingNext) {
          await supabase.from("user_progress").insert({
            user_id: userId,
            round_id: nextRound,
            status: "available",
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `ROUND ${roundId} COMPLETE! Score: ${score} points. Time: ${Math.floor(timeDiff / 60)}m ${timeDiff % 60}s`,
      });
    }

    return NextResponse.json({
      success: false,
      message: "ERROR: Could not process flag. Try again.",
    });
  } catch (error) {
    console.error("Flag validation error:", error);
    return NextResponse.json(
      { success: false, message: "ERROR: Internal server error." },
      { status: 500 }
    );
  }
}
