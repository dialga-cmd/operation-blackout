import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { refreshScoreLeaderboard } from "@/lib/score-leaderboard";

const secret = process.env.CACHE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 503 }
      );
    }

    const provided =
      request.headers.get("x-webhook-secret") ||
      request.headers.get("x-cache-secret");
    if (!provided || provided !== secret) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const rl = checkRateLimit("leaderboard:refresh", {
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    await refreshScoreLeaderboard();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leaderboard refresh webhook error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}