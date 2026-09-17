import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_DOMAIN_SUFFIX = ".iitm.ac.in";

function isAuthorizedEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN_SUFFIX);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/game";

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      // Always validate the email BEFORE any write happens.
      if (!user || !isAuthorizedEmail(user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/?error=unauthorized_domain`);
      }

      // Only authorized (.iitm.ac.in) emails are ever written to the DB.
      const adminSupabase = createAdminClient();
      await adminSupabase.from("users").upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: 'id' });

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
