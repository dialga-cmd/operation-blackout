import "server-only";
import { generateFlagKey } from "@/lib/crypto/flag-key";

// This module contains the flag ANSWER KEY and is server-only.
// The `server-only` import guarantees it can NEVER be bundled into
// client-side code, keeping real flag strings out of the participant's
// browser. Do not move these values into client-accessible files.

// Build the full expected flag string for a given user/round/day.
export function buildExpectedFlag(
  roundId: number,
  userId: string,
  dayDate: string
): string | null {
  const key = generateFlagKey(userId, roundId, dayDate);

  switch (roundId) {
    case 1:
      return `FLAG{the_attacker_did_not_choose_randomly_${key}}`;
    case 2:
      // Split across two nodes: part1 = "FLAG{hidden_in_pl" + key, part2 = "ain_permissions}"
      return `FLAG{hidden_in_pl${key}ain_permissions}`;
    case 3:
      return `FLAG{the_trace_that_remained_${key}}`;
    default:
      return null;
  }
}

// Decoy flags (same for all users - rejected at submission)
export const DECOY_FLAGS = [
  "FLAG{the_server_was_compromised_at_midnight}",
  "FLAG{backup_logs_reveal_the_trail}",
  "FLAG{old_backup_contains_evidence}",
  "FLAG{correlated_logs_reveal_everything}",
  "FLAG{the_last_log_was_the_key}",
  "FLAG{persistence_check_found_it}",
];
