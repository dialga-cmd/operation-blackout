/**
 * Deletes duplicate correct flag_attempts created by re-submissions.
 *
 * Every correct submission inserts a row into flag_attempts. Before the
 * reattempt fix, a player who re-submitted a correct flag created a SECOND
 * correct row, so their name appeared multiple times in the dashboard
 * leaderboard. The original (first) attempt is the earliest correct row for a
 * user+round; every later correct row is a reattempt record.
 *
 * This script keeps the earliest correct attempt per user+round and deletes
 * the rest. It only touches flag_attempts (scoring lives in user_progress).
 *
 * Usage:
 *   npx tsx scripts/delete-reattempts.ts          # dry run (preview only)
 *   npx tsx scripts/delete-reattempts.ts --apply  # delete rows from the database
 */

import { createAdminClient } from "../src/lib/supabase/admin";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.warn("[warn] could not load .env.local, falling back to environment.");
}

const APPLY = process.argv.includes("--apply");

const supabase = createAdminClient();

interface AttemptRow {
  id: string;
  user_id: string;
  round_id: number;
  submitted_at: string;
}

async function main() {
  const { data: attempts, error } = await supabase
    .from("flag_attempts")
    .select("id, user_id, round_id, submitted_at")
    .eq("correct", true)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(`flag_attempts fetch failed: ${error.message}`);

  const kept = new Map<string, AttemptRow>();
  const reattempts: { record: AttemptRow; kept: AttemptRow }[] = [];

  for (const a of attempts || ([] as AttemptRow[])) {
    const key = `${a.user_id}:${a.round_id}`;
    const first = kept.get(key);
    if (first) {
      reattempts.push({ record: a, kept: first });
    } else {
      kept.set(key, a);
    }
  }

  console.log("\n=== REATTEMPT CLEANUP (keeping earliest correct attempt) ===\n");

  if (reattempts.length === 0) {
    console.log("No reattempt records found. Nothing to do.\n");
    return;
  }

  for (const { record, kept } of reattempts) {
    console.log(
      `  - user ${record.user_id} R${record.round_id}: deleting ${record.id} ` +
        `(${record.submitted_at}) — keeping ${kept.id} (${kept.submitted_at})`
    );
  }

  if (APPLY) {
    const ids = reattempts.map((r) => r.record.id);
    const { error: deleteError } = await supabase
      .from("flag_attempts")
      .delete()
      .in("id", ids);
    if (deleteError) {
      console.error(`\n  ✗ delete failed: ${deleteError.message}`);
      process.exit(1);
    }
  }

  console.log(
    `\nResult: ${reattempts.length} reattempt record(s) found.` +
      (APPLY ? " Deleted." : " Nothing deleted.")
  );
  if (!APPLY) {
    console.log("Dry run only — rerun with --apply to delete these rows.");
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});