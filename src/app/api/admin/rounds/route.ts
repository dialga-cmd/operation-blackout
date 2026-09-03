import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify user is admin
    let isAdmin = false;
    try {
      const { data: adminRecord } = await adminSupabase
        .from("admins")
        .select("id")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      if (adminRecord) isAdmin = true;
    } catch {}

    if (!isAdmin) {
      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      isAdmin = adminEmails.length === 0 || (user.email ? adminEmails.includes(user.email.toLowerCase()) : false);
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { roundNumber, unlockDate, isActive } = await request.json();

    if (!roundNumber) {
      return NextResponse.json({ error: "Missing roundNumber" }, { status: 400 });
    }

    // Update round schedule in Supabase
    const { data, error } = await adminSupabase
      .from("rounds")
      .update({
        unlock_date: unlockDate,
        is_active: isActive !== undefined ? isActive : true,
      })
      .eq("number", roundNumber)
      .select()
      .single();

    if (error) {
      console.error("Failed to update round schedule:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, round: data });
  } catch (err) {
    console.error("Admin round update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
