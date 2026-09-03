import "server-only";
import { generateFlagKey } from "@/lib/crypto/flag-key";

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
      return `FLAG{hidden_in_pl${key}ain_permissions}`;
    case 3:
      return `FLAG{the_trace_that_remained_${key}}`;
    default:
      return null;
  }
}

export const DECOY_FLAGS = [
  "FLAG{the_server_was_compromised_at_midnight}",
  "FLAG{backup_logs_reveal_the_trail}",
  "FLAG{old_backup_contains_evidence}",
  "FLAG{correlated_logs_reveal_everything}",
  "FLAG{the_last_log_was_the_key}",
  "FLAG{persistence_check_found_it}",
];
