import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-side admin client using the service role key.
// Bypasses RLS — used ONLY in server-side API routes for sensitive operations
// like flag validation, bans, and organizer monitoring.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
