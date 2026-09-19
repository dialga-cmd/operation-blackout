import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const rl = checkRateLimit("location", {
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const xfwd = request.headers.get("x-forwarded-for");
    const ip =
      (xfwd ? xfwd.split(",")[0].trim() : null) ||
      request.headers.get("x-real-ip") ||
      null;

    const vercelCountry = request.headers.get("x-vercel-ip-country");
    const vercelTimezone = request.headers.get("x-vercel-ip-timezone");
    if (vercelTimezone) {
      return NextResponse.json({
        success: true,
        country: vercelCountry || null,
        timezone: vercelTimezone,
      });
    }

    if (!ip || ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
      return NextResponse.json({ success: true, country: null, timezone: null });
    }

    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return NextResponse.json({
        success: true,
        country: data?.country || null,
        timezone: data?.timezone?.id || null,
      });
    } catch {
      return NextResponse.json({ success: true, country: null, timezone: null });
    }
  } catch (err) {
    console.error("Location lookup error:", err);
    return NextResponse.json({ success: true, country: null, timezone: null });
  }
}