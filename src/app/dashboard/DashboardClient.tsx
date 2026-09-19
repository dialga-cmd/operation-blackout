"use client";

import { useEffect, useMemo, useState } from "react";
import { PixelSoldier } from "@/components/pixel-art";
import { formatTimestamp, formatDate } from "@/lib/format-time";
import { useUserTimeZone } from "@/lib/use-user-timezone";

interface DashboardProps {
  totalUsers: number;
  allUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "participant";
    created_at?: string;
  }>;
  roundsList: Array<{
    id: number;
    number: number;
    title: string;
    unlock_date: string;
    is_active: boolean;
  }>;
  roundStats: Array<{
    round: number;
    total: number;
    completed: number;
    avgScore: number;
  }>;
  allProgress: Array<{
    user_id: string;
    round_id: number;
    status: string;
    score: number | null;
    started_at: string | null;
    completed_at: string | null;
    users?: { email: string; name: string };
    rounds?: { number: number; title: string };
  }>;
  allAttempts: Array<{
    id: string;
    flag: string;
    correct: boolean;
    submitted_at: string;
    users?: { email: string; name: string };
    round_id: number;
  }>;
  cheatAttempts: Array<{
    id: string;
    submitter_id: string;
    owner_id: string;
    flag: string;
    round_id: number;
    detected_at: string;
    status: string;
  }>;
  leaderboardData: Array<{
    id: string;
    flag: string;
    round_id: number;
    submitted_at: string;
    user_id: string;
    users?: { email: string; name: string };
  }>;
  scoreLeaderboardData: Array<{
    user_id: string;
    round_id: number;
    status: string;
    score: number | null;
    started_at: string | null;
    completed_at: string | null;
    users?: { email: string; name: string };
  }>;
}

function getLocalDatetime(isoString: string | null | undefined) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface OverallRow {
  user_id: string;
  total: number;
  roundsCompleted: number;
  completedAt: number;
  users?: { email: string; name: string };
  breakdown: { round_id: number; score: number }[];
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function DashboardClient({
  totalUsers,
  allUsers,
  roundsList: initialRoundsList,
  roundStats,
  allProgress,
  allAttempts,
  cheatAttempts,
  leaderboardData,
  scoreLeaderboardData,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "users" | "attempts" | "cheats" | "timelines" | "leaderboard">("overview");
  const [rounds, setRounds] = useState(initialRoundsList);
  const [savingRound, setSavingRound] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [scoreLeaderboard, setScoreLeaderboard] = useState(scoreLeaderboardData);
  const [leaderboardRound, setLeaderboardRound] = useState<0 | 1 | 2 | 3>(1);
  const [leaderboardUpdatedAt, setLeaderboardUpdatedAt] = useState<string | null>(null);
  const [redisStatus, setRedisStatus] = useState<"online" | "offline" | "disabled" | "unknown">("unknown");
  const [redisCachedRows, setRedisCachedRows] = useState<number | null>(null);
  const [redisUpdatedAt, setRedisUpdatedAt] = useState<string | null>(null);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const { timezone } = useUserTimeZone();

  const roundWinners = [1, 2, 3].map((round) => ({
    round,
    winner: leaderboardData.find((l) => l.round_id === round) || null,
  }));

  const [timelineRound, setTimelineRound] = useState<1 | 2 | 3>(1);

  const roundLeaderboard = leaderboardData.filter(
    (l) => l.round_id === timelineRound
  );

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

  const handleDownloadLeaderboardCSV = () => {
    const parts: string[] = [];
    const section = (title: string) => parts.push(`\n===== ${title} =====\n`);
    const row = (cells: unknown[]) => parts.push(cells.map(csvEscape).join(","));

    if (leaderboardRound === 0) {
      section("SCORE LEADERBOARD (OVERALL)");
      row(["Rank", "User", "Total Score", "Round Scores"]);
      overallLeaderboard.forEach((l, index) =>
        row([
          index + 1,
          l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown",
          l.total,
          [...l.breakdown]
            .sort((a, b) => a.round_id - b.round_id)
            .map((b) => `R${b.round_id}: ${b.score}`)
            .join(" | "),
        ])
      );
    } else {
      section(`SCORE LEADERBOARD (ROUND ${leaderboardRound})`);
      row(["Rank", "User", "Score", "Completed At (Local)"]);
      roundScoreLeaderboard.forEach((l, index) =>
        row([
          index + 1,
          l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown",
          l.score ?? "",
          formatTimestamp(l.completed_at, timezone),
        ])
      );
    }

    const blob = new Blob(["\uFEFF" + parts.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      leaderboardRound === 0
        ? `operation_blackout_overall_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`
        : `operation_blackout_round${leaderboardRound}_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const parts: string[] = [];
    const section = (title: string) => parts.push(`\n===== ${title} =====\n`);
    const row = (cells: unknown[]) => parts.push(cells.map(csvEscape).join(","));

    section("USERS (ALL)");
    row(["Email", "Name", "User ID", "Role", "Joined Date"]);
    allUsers.forEach((u) =>
      row([u.email, u.name || "", u.id, u.role, formatDate(u.created_at, timezone)])
    );

    section("ROUND SCHEDULE & LOCKS");
    row(["Round", "Title", "Unlock Date", "Status"]);
    rounds.forEach((r) =>
      row([r.number, r.title, r.unlock_date, r.is_active ? "ACTIVE" : "LOCKED"])
    );

    section("USER PROGRESS (ALL)");
    row(["User", "Round", "Status", "Score", "Started At", "Completed At"]);
    allProgress.forEach((p) =>
      row([
        p.users?.email || p.user_id,
        p.round_id,
        p.status,
        p.score ?? "",
        formatTimestamp(p.started_at, timezone),
        formatTimestamp(p.completed_at, timezone),
      ])
    );

    section("FLAG ATTEMPTS (LAST 100)");
    row(["User", "Round", "Flag", "Result", "Time"]);
    allAttempts.forEach((a) =>
      row([
        a.users?.email || "-",
        a.round_id,
        a.flag,
        a.correct ? "CORRECT" : "WRONG",
        formatTimestamp(a.submitted_at, timezone),
      ])
    );

    section("CHEATING ATTEMPTS");
    row(["Submitter", "Flag Owner", "Round", "Flag", "Status", "Detected"]);
    cheatAttempts.forEach((c) => {
      const submitterEmail = allUsers.find((u) => u.id === c.submitter_id)?.email || c.submitter_id;
      const ownerEmail = allUsers.find((u) => u.id === c.owner_id)?.email || c.owner_id;
      row([submitterEmail, ownerEmail, c.round_id, c.flag, c.status.toUpperCase(), formatTimestamp(c.detected_at, timezone)]);
    });

    section("ROUND WINNERS");
    row(["Round", "Winner", "Email", "Time", "Flag"]);
    roundWinners.forEach(({ round, winner }) =>
      row([
        round,
        winner?.users?.name || "Not won yet",
        winner?.users?.email || "",
        winner ? formatTimestamp(winner.submitted_at, timezone) : "",
        winner?.flag || "",
      ])
    );

    section("LEADERBOARD (CORRECT FLAGS)");
    row(["Rank", "User", "Round", "Time", "Flag"]);
    leaderboardData.forEach((l, index) =>
      row([index + 1, l.users?.email || "Unknown", l.round_id, formatTimestamp(l.submitted_at, timezone), l.flag])
    );

    section("SCORE LEADERBOARD (HIGHEST POINTS)");
    row(["Rank", "User", "Round", "Score", "Completed At"]);
    [...scoreLeaderboard]
      .sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          new Date(a.completed_at || 0).getTime() -
            new Date(b.completed_at || 0).getTime()
      )
      .forEach((l, index) =>
        row([
          index + 1,
          l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown",
          l.round_id,
          l.score ?? "",
          formatTimestamp(l.completed_at, timezone),
        ])
      );

    const blob = new Blob(["\uFEFF" + parts.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operation_blackout_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/admin/leaderboard", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setScoreLeaderboard(data.data);
          setLeaderboardUpdatedAt(new Date().toLocaleTimeString());
        }
        if (!cancelled && data.cache) {
          setRedisStatus(
            !data.cache.configured
              ? "disabled"
              : data.cache.online
                ? "online"
                : "offline"
          );
          if (typeof data.cache.cachedRows === "number") {
            setRedisCachedRows(data.cache.cachedRows);
          }
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

  const handleRefreshRedisCache = async () => {
    setRefreshingCache(true);
    setRedisUpdatedAt(null);
    try {
      const res = await fetch("/api/admin/leaderboard", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data)) {
          setScoreLeaderboard(data.data);
          setLeaderboardUpdatedAt(new Date().toLocaleTimeString());
        }
        setRedisUpdatedAt(new Date().toLocaleTimeString());
        if (data.cache) {
          setRedisStatus(
            !data.cache.configured
              ? "disabled"
              : data.cache.online
                ? "online"
                : "offline"
          );
          if (typeof data.cache.cachedRows === "number") {
            setRedisCachedRows(data.cache.cachedRows);
          }
        }
      }
    } catch {
      // Fall through; keep current snapshot.
    } finally {
      setRefreshingCache(false);
    }
  };

  const handleUpdateRoundSchedule = async (roundNumber: number, unlockDate: string, isActive: boolean) => {
    setSavingRound(roundNumber);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/admin/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundNumber, unlockDate, isActive }),
      });

      const data = await res.json();
      if (data.success) {
        setRounds((prev) =>
          prev.map((r) => (r.number === roundNumber ? { ...r, unlock_date: unlockDate, is_active: isActive } : r))
        );
        setSaveStatus(`Round ${roundNumber} updated successfully!`);
      } else {
        setSaveStatus(`Failed to update Round ${roundNumber}: ${data.error}`);
      }
    } catch {
      setSaveStatus(`Error updating Round ${roundNumber}`);
    }

    setSavingRound(null);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] noise-bg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <PixelSoldier />
          <div>
            <h1 className="font-pixel text-2xl text-[#00ff41]">
              OPERATION BLACKOUT
            </h1>
            <p className="font-terminal text-base text-[#ffb000]">
              ORGANIZER DASHBOARD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadCSV}
            className="pixel-btn text-xs bg-[#ffb000] text-black font-bold py-2 px-4 hover:bg-[#ffc000]"
          >
            EXPORT ALL DATA
          </button>
          <div className="font-terminal text-base text-[#666]">
            {currentTime ?? "--"}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="pixel-border bg-[#0d1117] p-4">
          <div className="font-pixel text-xs text-[#666] mb-2">
            TOTAL REGISTERED USERS
          </div>
          <div className="font-terminal text-4xl text-[#00ff41]">
            {totalUsers}
          </div>
          <div className="font-terminal text-sm text-[#ffb000] mt-1">
            Admins: {allUsers.filter((u) => u.role === "admin").length} | Participants: {allUsers.filter((u) => u.role === "participant").length}
          </div>
        </div>

        {roundStats.map((stat) => (
          <div key={stat.round} className="pixel-border bg-[#0d1117] p-4">
            <div className="font-pixel text-xs text-[#666] mb-2">
              ROUND {stat.round}
            </div>
            <div className="font-terminal text-4xl text-[#ffb000]">
              {stat.completed}/{stat.total}
            </div>
            <div className="font-terminal text-sm text-[#666] mt-1">
              Avg Score: {stat.avgScore}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["overview", "schedule", "users", "attempts", "cheats", "timelines", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pixel-btn text-sm ${activeTab === tab
                ? "bg-[#00ff41] text-black font-bold"
                : "bg-[#1a472a] text-[#00ff41]"
              }`}
          >
            {tab === "schedule"
              ? "ROUND SCHEDULE & LOCKS"
              : tab === "users"
                ? "ALL USERS & ROLES"
                : tab.toUpperCase()}
          </button>
        ))}
      </div>

      {saveStatus && (
        <div className="mb-4 p-3 bg-[#1a472a] border border-[#00ff41] font-terminal text-base text-[#00ff41] rounded">
          {saveStatus}
        </div>
      )}

      {/* Tab Content */}
      <div className="pixel-border bg-[#0d1117] p-4">
        {activeTab === "schedule" && (
          <div>
            <h2 className="font-pixel text-base text-[#00ff41] mb-2">
              ROUND UNLOCK SCHEDULE & EVENT TIMINGS
            </h2>
            <p className="font-terminal text-sm text-[#ffb000] mb-6">
              Set the exact date, time, and active status for each round. Participants who finish early will see a countdown popup until the scheduled unlock time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((num) => {
                const roundInfo = rounds.find((r) => r.number === num) || {
                  number: num,
                  title: `Round ${num}`,
                  unlock_date: "",
                  is_active: true,
                };

                // Use local timezone format for datetime-local input YYYY-MM-DDTHH:mm
                const formattedDateStr = getLocalDatetime(roundInfo.unlock_date);

                return (
                  <div key={num} className="border border-[#1a472a] bg-[#0a0a0a] p-4 rounded">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-pixel text-base text-[#00ff41]">
                        ROUND {num}
                      </span>
                      <span
                        className={`font-terminal text-sm px-2 py-1 ${roundInfo.is_active
                            ? "bg-[#00ff41]/20 text-[#00ff41]"
                            : "bg-red-500/20 text-red-500"
                          }`}
                      >
                        {roundInfo.is_active ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>

                    <div className="space-y-4 font-terminal text-sm">
                      <div>
                        <label className="block text-[#666] mb-1">
                          Unlock Date & Time (Local Event Time):
                        </label>
                        <input
                          type="datetime-local"
                          defaultValue={formattedDateStr}
                          id={`unlock-date-${num}`}
                          className="w-full bg-[#0d1117] border border-[#1a472a] text-[#00ff41] p-2 focus:outline-none focus:border-[#00ff41]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={roundInfo.is_active}
                          id={`is-active-${num}`}
                          className="accent-[#00ff41]"
                        />
                        <label htmlFor={`is-active-${num}`} className="text-[#ffb000]">
                          Round Available to Play
                        </label>
                      </div>

                      <button
                        disabled={savingRound === num}
                        onClick={() => {
                          const dateVal = (
                            document.getElementById(`unlock-date-${num}`) as HTMLInputElement
                          ).value;
                          const activeVal = (
                            document.getElementById(`is-active-${num}`) as HTMLInputElement
                          ).checked;
                          if (!dateVal) {
                            setSaveStatus(`Choose an unlock date for Round ${num}.`);
                            return;
                          }
                          const isoDate = new Date(dateVal).toISOString();
                          handleUpdateRoundSchedule(num, isoDate, activeVal);
                        }}
                        className="pixel-btn text-sm w-full bg-[#00ff41] text-black font-bold py-2 mt-2"
                      >
                        {savingRound === num ? "SAVING..." : `SAVE ROUND ${num} SCHEDULE`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === "users" && (
          <div>
            <h2 className="font-pixel text-base text-[#00ff41] mb-4 flex items-center justify-between">
              <span>REGISTERED USERS & ROLES</span>
              <span className="text-sm text-[#ffb000] font-terminal font-normal">
                Admins checked from Supabase `admins` table & `ADMIN_EMAILS`
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-base">
                <thead>
                  <tr className="border-b border-[#1a472a]">
                    <th className="text-left py-2 text-[#666]">Email / Name</th>
                    <th className="text-left py-2 text-[#666]">User ID</th>
                    <th className="text-left py-2 text-[#666]">Role / Status</th>
                    <th className="text-left py-2 text-[#666]">Rounds Completed</th>
                    <th className="text-left py-2 text-[#666]">Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#666]">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    allUsers.map((u) => {
                      const userCompletedRounds = allProgress.filter(
                        (p) => p.user_id === u.id && p.status === "completed"
                      ).length;

                      return (
                        <tr key={u.id} className="border-b border-[#1a472a]/50">
                          <td className="py-2 text-[#00ff41]">
                            {u.email} {u.name ? `(${u.name})` : ""}
                          </td>
                          <td className="py-2 font-mono text-sm text-[#666]">
                            {u.id}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 text-sm font-bold ${u.role === "admin"
                                  ? "bg-[#ffb000]/20 text-[#ffb000] border border-[#ffb000]"
                                  : "bg-[#00ff41]/10 text-[#00ff41]"
                                }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 text-[#ffb000]">
                            {userCompletedRounds} / 3 Rounds
                          </td>
                          <td className="py-2 text-[#666]">
                            {formatDate(u.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === "overview" && (
          <div>
            <h2 className="font-pixel text-base text-[#00ff41] mb-4">
              USER PROGRESS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-base">
                <thead>
                  <tr className="border-b border-[#1a472a]">
                    <th className="text-left py-2 text-[#666]">User</th>
                    <th className="text-left py-2 text-[#666]">Round</th>
                    <th className="text-left py-2 text-[#666]">Status</th>
                    <th className="text-left py-2 text-[#666]">Score</th>
                    <th className="text-left py-2 text-[#666]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#666]">
                        No users registered yet.
                      </td>
                    </tr>
                  ) : (
                    allUsers.map((u) => {
                      // Find highest progress for this user
                      const userProgress = allProgress.filter((p) => p.user_id === u.id);
                      let highestProgress = userProgress[0];
                      if (userProgress.length > 1) {
                        const statusWeight: Record<string, number> = {
                          "completed": 3,
                          "in_progress": 2,
                          "available": 1,
                          "locked": 0
                        };
                        highestProgress = userProgress.reduce((prev, curr) => {
                          const prevW = statusWeight[prev.status] || 0;
                          const currW = statusWeight[curr.status] || 0;
                          if (currW > prevW) return curr;
                          if (currW === prevW && curr.round_id > prev.round_id) return curr;
                          return prev;
                        });
                      }

                      return (
                        <tr key={u.id} className="border-b border-[#1a472a]/50">
                          <td className="py-2 text-[#00ff41]">
                            {u.name ? `${u.name} (${u.email})` : u.email}
                          </td>
                          <td className="py-2 text-[#ffb000]">
                            {highestProgress ? `Round ${highestProgress.round_id}` : "Not Started"}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 text-sm ${!highestProgress
                                  ? "bg-[#666]/20 text-[#666]"
                                  : highestProgress.status === "completed"
                                    ? "bg-[#00ff41]/20 text-[#00ff41]"
                                    : highestProgress.status === "in_progress"
                                      ? "bg-[#ffb000]/20 text-[#ffb000]"
                                      : "bg-[#666]/20 text-[#666]"
                                }`}
                            >
                              {highestProgress ? highestProgress.status : "locked"}
                            </span>
                          </td>
                          <td className="py-2 text-[#00ff41]">
                            {highestProgress?.score || "-"}
                          </td>
                          <td className="py-2 text-[#666]">
                            {highestProgress?.completed_at ? formatTimestamp(highestProgress.completed_at, timezone) : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "attempts" && (
          <div>
            <h2 className="font-pixel text-base text-[#00ff41] mb-4">
              FLAG ATTEMPTS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-base">
                <thead>
                  <tr className="border-b border-[#1a472a]">
                    <th className="text-left py-2 text-[#666]">User</th>
                    <th className="text-left py-2 text-[#666]">Round</th>
                    <th className="text-left py-2 text-[#666]">Flag</th>
                    <th className="text-left py-2 text-[#666]">Result</th>
                    <th className="text-left py-2 text-[#666]">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#666]">
                        No flag attempts found.
                      </td>
                    </tr>
                  ) : allAttempts.map((a) => (
                    <tr key={a.id} className="border-b border-[#1a472a]/50">
                      <td className="py-2 text-[#00ff41]">
                        {a.users?.name ? `${a.users.name} (${a.users.email})` : a.users?.email || "-"}
                      </td>
                      <td className="py-2 text-[#ffb000]">
                        Round {a.round_id}
                      </td>
                      <td className="py-2 text-[#666] font-mono text-sm max-w-xs truncate">
                        {a.flag}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 text-sm ${a.correct
                              ? "bg-[#00ff41]/20 text-[#00ff41]"
                              : "bg-red-500/20 text-red-500"
                            }`}
                        >
                          {a.correct ? "CORRECT" : "WRONG"}
                        </span>
                      </td>
                      <td className="py-2 text-[#666]">
                        {formatTimestamp(a.submitted_at, timezone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "cheats" && (
          <div>
            <h2 className="font-pixel text-base text-red-500 mb-4">
              CHEATING ATTEMPTS
            </h2>
            {cheatAttempts.length === 0 ? (
              <div className="font-terminal text-[#666] text-center py-8">
                No cheating attempts detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-terminal text-base">
                  <thead>
                    <tr className="border-b border-[#1a472a]">
                      <th className="text-left py-2 text-[#666]">Submitter</th>
                      <th className="text-left py-2 text-[#666]">Flag Owner</th>
                      <th className="text-left py-2 text-[#666]">Round</th>
                      <th className="text-left py-2 text-[#666]">Flag</th>
                      <th className="text-left py-2 text-[#666]">Status</th>
                      <th className="text-left py-2 text-[#666]">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheatAttempts.map((c) => (
                      <tr key={c.id} className="border-b border-[#1a472a]/50">
                        <td className="py-2 text-red-500">
                          {allUsers.find((user) => user.id === c.submitter_id)?.email || c.submitter_id}
                        </td>
                        <td className="py-2 text-[#ffb000]">
                          {allUsers.find((user) => user.id === c.owner_id)?.email || c.owner_id}
                        </td>
                        <td className="py-2 text-[#666]">
                          Round {c.round_id}
                        </td>
                        <td className="py-2 text-[#666] font-mono text-sm max-w-xs truncate">
                          {c.flag}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-1 text-sm bg-red-500/20 text-red-500">
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 text-[#666]">
                          {formatTimestamp(c.detected_at, timezone)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "timelines" && (
          <div>
            <h2 className="font-pixel text-base text-[#ffb000] mb-4">
              ROUND WINNERS (CORRECT FLAG LEADERBOARD)
            </h2>

            <div className="flex gap-2 mb-6 flex-wrap">
              {([1, 2, 3] as const).map((round) => (
                <button
                  key={round}
                  onClick={() => setTimelineRound(round)}
                  className={`pixel-btn text-sm ${timelineRound === round
                      ? "bg-[#00ff41] text-black font-bold"
                      : "bg-[#1a472a] text-[#00ff41]"
                    }`}
                >
                  ROUND {round}
                </button>
              ))}
            </div>

            {roundLeaderboard.length === 0 ? (
              <div className="font-terminal text-[#666] text-center py-8">
                No correct flags submitted for Round {timelineRound} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-terminal text-base">
                  <thead>
                    <tr className="border-b border-[#1a472a]">
                      <th className="text-left py-2 text-[#666]">Rank</th>
                      <th className="text-left py-2 text-[#666]">User</th>
                      <th className="text-left py-2 text-[#666]">Time (Local)</th>
                    </tr>
                  </thead>
<tbody>
                    {roundLeaderboard.map((l, idx) => (
                      <tr key={l.id} className="border-b border-[#1a472a]/50">
                        <td className="py-2 text-[#ffb000]">#{idx + 1}</td>
                        <td className="py-2 text-[#00ff41]">
                          {l.users?.name ? `${l.users.name} (${l.users.email})` : l.users?.email || "Unknown"}
                        </td>
                        <td className="py-2 text-[#666]">{formatTimestamp(l.submitted_at, timezone)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <h2 className="font-pixel text-base text-[#ffb000]">
                {leaderboardRound === 0
                  ? "SCORE LEADERBOARD (HIGHEST TOTAL)"
                  : "SCORE LEADERBOARD (HIGHEST POINTS)"}
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className={`font-terminal text-sm px-2 py-1 ${
                    redisStatus === "online"
                      ? "bg-[#00ff41]/20 text-[#00ff41]"
                      : redisStatus === "offline"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-[#666]/20 text-[#666]"
                  }`}
                >
                  REDIS: {redisStatus.toUpperCase()}
                  {redisCachedRows !== null && redisStatus === "online"
                    ? ` (${redisCachedRows} ROWS)`
                    : ""}
                </span>
                <button
                  onClick={handleRefreshRedisCache}
                  disabled={refreshingCache}
                  className="pixel-btn text-xs bg-[#ffb000] text-black font-bold py-2 px-4 hover:bg-[#ffc000] disabled:opacity-60"
                >
                  {refreshingCache ? "SYNCING..." : "REFRESH REDIS CACHE"}
                </button>
                {redisUpdatedAt && (
                  <span className="font-terminal text-sm text-[#00ff41]">
                    CACHE SYNCED {redisUpdatedAt}
                  </span>
                )}
                <button
                  onClick={handleDownloadLeaderboardCSV}
                  className="pixel-btn text-xs bg-[#ffb000] text-black font-bold py-2 px-4 hover:bg-[#ffc000]"
                >
                  {leaderboardRound === 0
                    ? "EXPORT OVERALL CSV"
                    : `EXPORT ROUND ${leaderboardRound} CSV`}
                </button>
                <span className="font-terminal text-sm text-[#00ff41] flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#00ff41] rounded-full animate-pulse"></span>
                  LIVE
                  {leaderboardUpdatedAt ? ` · UPDATED ${leaderboardUpdatedAt}` : ""}
                </span>
              </div>
            </div>
            <p className="font-terminal text-sm text-[#666] mb-6">
              {leaderboardRound === 0
                ? "Ranks players by the total points earned across all rounds — highest sum first. Refreshes automatically every 5 seconds, reading directly from the database. Use "
                : "Ranks players by score for the selected round — highest points first. Refreshes automatically every 5 seconds, reading directly from the database. Use "}
              <span className="text-[#ffb000]">REFRESH REDIS CACHE</span>
              {" to push the latest database state to the Redis cache used by the public leaderboard."}
            </p>

            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setLeaderboardRound(0)}
                className={`pixel-btn text-sm ${leaderboardRound === 0
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
                  className={`pixel-btn text-sm ${leaderboardRound === round
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
        )}
      </div>
    </div>
  );
}
