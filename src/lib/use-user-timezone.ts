"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ob:user-tz";
const TTL_MS = 24 * 60 * 60 * 1000;

interface CachedTz {
  country: string | null;
  timezone: string | null;
  savedAt: number;
}

export interface UserTimeZoneState {
  timezone: string | null;
  country: string | null;
  ready: boolean;
}

function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function readCache(): CachedTz | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedTz;
    if (Date.now() - cached.savedAt > TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
}

export function useUserTimeZone(): UserTimeZoneState {
  const [state, setState] = useState<UserTimeZoneState>(() => {
    if (typeof window === "undefined") {
      return { timezone: null, country: null, ready: false };
    }
    const cached = readCache();
    return {
      timezone: cached?.timezone || browserTimezone(),
      country: cached?.country || null,
      ready: true,
    };
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (readCache()) return;

      try {
        const res = await fetch("/api/location", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        const timezone = data.timezone || browserTimezone();
        const country = data.country || null;
        setState({ timezone, country, ready: true });

        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ country, timezone, savedAt: Date.now() })
          );
        } catch {}
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            timezone: prev.timezone || browserTimezone(),
            country: prev.country,
            ready: true,
          }));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}