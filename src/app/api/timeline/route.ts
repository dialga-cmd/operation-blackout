import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { roundId, userId, content } = await request.json();

    if (!roundId || !userId || !content) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated as this user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("timeline_submissions").insert({
      user_id: userId,
      round_id: roundId,
      content,
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
      message: "TIMELINE SUBMITTED. Thanks for the report — the analysts will review it.",
    });
  } catch (error) {
    console.error("Timeline submission error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
