import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { roundId, userId, content } = await request.json();
    const normalizedRoundId = Number(roundId);
    const timelineContent =
      typeof content === "string" ? content.replace(/\\n/g, "\n").trim() : "";
    const lineCount = timelineContent
      ? timelineContent.split(/\r?\n/).length
      : 0;

    if (!normalizedRoundId || !userId || !timelineContent) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    if (normalizedRoundId !== 3 || lineCount < 4 || lineCount > 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Timeline reports must be 4-6 lines and submitted for Round 3.",
        },
        { status: 400 }
      );
    }

    const rl = checkRateLimit(`timeline:${userId}`, RATE_LIMITS.timeline);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
        },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("timeline_submissions").insert({
      user_id: userId,
      round_id: normalizedRoundId,
      content: timelineContent,
    });

    if (error) {
      console.error("Timeline insert error:", error);
      return NextResponse.json(
        { success: false, message: "Error saving timeline." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "TIMELINE SUBMITTED. Thanks for the report — the analysts will review it.",
    });
  } catch (error) {
    console.error("Timeline submission error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}