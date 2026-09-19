/**
 * Score recovery for the reattempt bug.
 *
 * When a player re-submitted a correct flag, the validate route recomputed the
 * score from the (now later) submission time and overwrote user_progress:
 * score and completed_at were lowered. The ORIGINAL completion is preserved in
 * flag_attempts: every correct submission inserts a row with `submitted_at`
 * (default now()), so the earliest `correct=true` row for a user+round records
 * the original completion time.
 *
 * This script recomputes the original score for every completed round using
 * that earliest correct attempt and restores it ONLY when the stored score is
 * lower (i.e. provably damaged by a reattempt). Other players are untouched.
 *
 * Usage:
 *   npx tsx scripts/restore-scores.ts          # dry run (preview only)
 *   npx tsx scripts/restore-scores.ts --apply  # write changes to the database
 */

import { createAdminClient } from "../src/lib/supabase/admin";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.warn("[warn] could not load .env.local, falling back to environment.");
}

const APPLY = process.argv.includes("--apply");

const supabase = createAdminClient();

interface ProgressRow {
  id: string;
  user_id: string;
  round_id: number;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
}

function recomputeScore(
  startedMs: number,
  firstCorrectMs: number,
  maxScore: number
): number {
  const timeDiff = Math.max(
    0,
    Math.floor((firstCorrectMs - startedMs) / 1000)
  );
  return Math.max(100, maxScore - Math.floor(timeDiff / 10));
}

async function main() {
  const { data: rounds } = await supabase
    .from("rounds")
    .select("number, max_score");

  const maxScoreByRound: Record<number, number> = {};
  for (const r of rounds || []) maxScoreByRound[r.number] = r.max_score ?? 1000;

  const { data: completed, error: progressError } = await supabase
    .from("user_progress")
    .select("id, user_id, round_id, started_at, completed_at, score")
    .eq("status", "completed");

  if (progressError) throw new Error(`progress fetch failed: ${progressError.message}`);

  const { data: correctAttempts, error: attemptsError } = await supabase
    .from("flag_attempts")
    .select("user_id, round_id, submitted_at")
    .eq("correct", true);

  if (attemptsError) throw new Error(`attempts fetch failed: ${attemptsError.message}`);

  const earliest = new Map<string, number>();
  for (const a of correctAttempts || []) {
    const t = new Date(a.submitted_at).getTime();
    if (Number.isNaN(t)) continue;
    const key = `${a.user_id}:${a.round_id}`;
    const cur = earliest.get(key);
    if (cur === undefined || t < cur) earliest.set(key, t);
  }

  let restored = 0;
  let unchanged = 0;
  let skipped = 0;

  console.log("\n=== SCORE RECOVERY (original = earliest correct attempt) ===\n");

  for (const p of (completed || []) as ProgressRow[]) {
    const maxScore = maxScoreByRound[p.round_id] ?? 1000;
    const startedMs = p.started_at ? new Date(p.started_at).getTime() : NaN;
    const firstCorrectMs = earliest.get(`${p.user_id}:${p.round_id}`);
    const stored = p.score ?? 0;

    if (Number.isNaN(startedMs) || firstCorrectMs === undefined) {
      skipped++;
      console.log(
        `  - user ${p.user_id} R${p.round_id}: no started_at / correct attempt, skipped`
      );
      continue;
    }

    const original = recomputeScore(startedMs, firstCorrectMs, maxScore);
    const originalCompletedAt = new Date(firstCorrectMs).toISOString();

    if (stored < original) {
      restored++;
      console.log(
        `  ✓ user ${p.user_id} R${p.round_id}: ${stored} -> ${original} points ` +
          `(first correct ${originalCompletedAt} vs stored ${p.completed_at ?? "none"})`
      );
      if (APPLY) {
        const { error } = await supabase
          .from("user_progress")
          .update({ score: original, completed_at: originalCompletedAt })
          .eq("id", p.id);
        if (error) {
          restored--;
          console.error(`    ✗ update failed: ${error.message}`);
        }
      }
    } else if (stored === original) {
      unchanged++;
    } else {
      skipped++;
      console.log(
        `  ? user ${p.user_id} R${p.round_id}: stored ${stored} > recomputed ${original}, left untouched`
      );
    }
  }

  console.log(
    `\nResult: ${restored} to restore, ${unchanged} already correct, ${skipped} skipped.`
  );
  if (!APPLY) {
    console.log("Dry run only — rerun with --apply to write changes.");
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});