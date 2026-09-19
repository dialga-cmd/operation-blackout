"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PixelSoldier } from "@/components/pixel-art";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp } from "@/lib/format-time";
import { useUserTimeZone } from "@/lib/use-user-timezone";

interface ScoreRow {
  user_id: string;
  round_id: number;
  status: string;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  users?: { email: string; name: string };
}

interface LeaderboardClientProps {
  initialData: ScoreRow[];
}

interface OverallRow {
  user_id: string;
  total: number;
  roundsCompleted: number;
  completedAt: number;
  users?: ScoreRow["users"];
  breakdown: { round_id: number; score: number }[];
}

export function LeaderboardClient({ initialData }: LeaderboardClientProps) {
  const router = useRouter();
  const { timezone } = useUserTimeZone();
  const [scoreLeaderboard, setScoreLeaderboard] = useState<ScoreRow[]>(initialData);
  const [leaderboardRound, setLeaderboardRound] = useState<0 | 1 | 2 | 3>(0);
  const [leaderboardUpdatedAt, setLeaderboardUpdatedAt] = useState<string | null>(null);

  const roundScoreLeaderboard = scoreLeaderboard
    .filter((l) => l.round_id === leaderboardRound)
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) ||
        new Date(a.completed_at || 0).getTime() -
          new Date(b.completed_at || 0).getTime()
    );

  const overallLeaderboard = useMemo<OverallRow[]>(() => {
    const byUser = new Map<string, OverallRow>();
    for (const l of scoreLeaderboard) {
      const cur = byUser.get(l.user_id) ?? {
        user_id: l.user_id,
        total: 0,
        roundsCompleted: 0,
        completedAt: Infinity,
        users: l.users,
        breakdown: [],
      };
      cur.total += l.score ?? 0;
      cur.roundsCompleted += 1;
      cur.completedAt = Math.min(
        cur.completedAt,
        new Date(l.completed_at || 0).getTime()
      );
      cur.breakdown.push({ round_id: l.round_id, score: l.score ?? 0 });
      byUser.set(l.user_id, cur);
    }
    return [...byUser.values()].sort(
      (a, b) =>
        b.total - a.total ||
        b.roundsCompleted - a.roundsCompleted ||
        a.completedAt - b.completedAt
    );
  }, [scoreLeaderboard]);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setScoreLeaderboard(data.data);
          setLeaderboardUpdatedAt(new Date().toLocaleTimeString());
        }
      } catch {
        // Keep showing the previous snapshot if a refresh fails.
      }
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise-bg p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/game" className="hover:opacity-80 transition-opacity">
            <PixelSoldier />
          </Link>
          <div>
            <h1 className="font-pixel text-2xl text-[#00ff41]">
              OPERATION BLACKOUT
            </h1>
            <p className="font-terminal text-base text-[#ffb000]">
              SCORE LEADERBOARD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/game"
            className="pixel-btn text-xs bg-[#1a472a] text-[#00ff41] py-2 px-4 hover:bg-[#00ff41] hover:text-black"
          >
            &larr; BACK TO MISSIONS
          </Link>
          <button
            onClick={handleLogout}
            className="pixel-btn text-xs bg-red-900/50 text-red-500 border border-red-500 py-2 px-4 hover:bg-red-900"
          >
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="pixel-border bg-[#0d1117] p-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h2 className="font-pixel text-base text-[#ffb000]">
            {leaderboardRound === 0
              ? "SCORE LEADERBOARD (HIGHEST TOTAL)"
              : "SCORE LEADERBOARD (HIGHEST POINTS)"}
          </h2>
          <span className="font-terminal text-sm text-[#00ff41] flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#00ff41] rounded-full animate-pulse"></span>
            LIVE
            {leaderboardUpdatedAt ? ` · UPDATED ${leaderboardUpdatedAt}` : ""}
          </span>
        </div>
        <p className="font-terminal text-sm text-[#666] mb-6">
          {leaderboardRound === 0
            ? "Ranks players by the total points earned across all rounds — highest sum first."
            : "Ranks players by score for the selected round — highest points first. Refreshes automatically every 5 seconds."}
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setLeaderboardRound(0)}
            className={`pixel-btn text-sm ${
              leaderboardRound === 0
                ? "bg-[#00ff41] text-black font-bold"
                : "bg-[#1a472a] text-[#00ff41]"
            }`}
          >
            OVERALL
          </button>
          {([1, 2, 3] as const).map((round) => (
            <button
              key={round}
              onClick={() => setLeaderboardRound(round)}
              className={`pixel-btn text-sm ${
                leaderboardRound === round
                  ? "bg-[#00ff41] text-black font-bold"
                  : "bg-[#1a472a] text-[#00ff41]"
              }`}
            >
              ROUND {round}
            </button>
          ))}
        </div>

        {leaderboardRound === 0 ? (
          overallLeaderboard.length === 0 ? (
            <div className="font-terminal text-[#666] text-center py-8">
              No scores submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-base">
                <thead>
                  <tr className="border-b border-[#1a472a]">
                    <th className="text-left py-2 text-[#666]">Rank</th>
                    <th className="text-left py-2 text-[#666]">User</th>
                    <th className="text-left py-2 text-[#666]">Total</th>
                    <th className="text-left py-2 text-[#666]">Round Scores</th>
                  </tr>
                </thead>
                <tbody>
                  {overallLeaderboard.map((l, idx) => (
                    <tr key={l.user_id} className="border-b border-[#1a472a]/50">
                      <td className="py-2 pr-4 text-lg text-[#ffb000] font-sans font-bold tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="py-2 text-[#00ff41]">
                        {l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown"}
                      </td>
                      <td className="py-2 pr-4 text-xl text-[#00ff41] font-sans font-bold tabular-nums">
                        {l.total}
                      </td>
                      <td className="py-2 text-[#666]">
                        {[...l.breakdown]
                          .sort((a, b) => a.round_id - b.round_id)
                          .map((b) => `R${b.round_id}: ${b.score}`)
                          .join("  ·  ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : roundScoreLeaderboard.length === 0 ? (
          <div className="font-terminal text-[#666] text-center py-8">
            No completed scores submitted for Round {leaderboardRound} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-terminal text-base">
              <thead>
                <tr className="border-b border-[#1a472a]">
                  <th className="text-left py-2 text-[#666]">Rank</th>
                  <th className="text-left py-2 text-[#666]">User</th>
                  <th className="text-left py-2 text-[#666]">Score</th>
                  <th className="text-left py-2 text-[#666]">Completed At (Local)</th>
                </tr>
              </thead>
              <tbody>
                {roundScoreLeaderboard.map((l, idx) => (
                  <tr key={`${l.user_id}-${l.round_id}`} className="border-b border-[#1a472a]/50">
                    <td className="py-2 pr-4 text-lg text-[#ffb000] font-sans font-bold tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="py-2 text-[#00ff41]">
                      {l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown"}
                    </td>
                    <td className="py-2 pr-4 text-xl text-[#00ff41] font-sans font-bold tabular-nums">
                      {l.score ?? "-"}
                    </td>
                    <td className="py-2 text-[#666]">{formatTimestamp(l.completed_at, timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}