import { VFSRound } from "@/lib/types";

interface CacheEntry {
  data: VFSRound;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

function getKey(userId: string, roundId: number, dayDate: string): string {
  return `${userId}:${roundId}:${dayDate}`;
}

export function getCachedVFS(
  userId: string,
  roundId: number,
  dayDate: string
): VFSRound | null {
  cleanup();
  const entry = cache.get(getKey(userId, roundId, dayDate));
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.data;
}

export function setCachedVFS(
  userId: string,
  roundId: number,
  dayDate: string,
  data: VFSRound,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  cache.set(getKey(userId, roundId, dayDate), {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}
