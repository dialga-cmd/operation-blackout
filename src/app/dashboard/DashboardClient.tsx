"use client";

import { useState } from "react";
import { PixelSoldier } from "@/components/pixel-art";

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
  timelineSubmissions: Array<{
    id: string;
    content: string;
    submitted_at: string;
    users?: { email: string; name: string };
    round_id: number;
  }>;
}

export function DashboardClient({
  totalUsers,
  allUsers,
  roundsList: initialRoundsList,
  roundStats,
  allProgress,
  allAttempts,
  cheatAttempts,
  timelineSubmissions,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "users" | "attempts" | "cheats" | "timelines">("overview");
  const [rounds, setRounds] = useState(initialRoundsList);
  const [savingRound, setSavingRound] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
            <h1 className="font-pixel text-xl text-[#00ff41]">
              OPERATION BLACKOUT
            </h1>
            <p className="font-terminal text-sm text-[#ffb000]">
              ORGANIZER DASHBOARD
            </p>
          </div>
        </div>
        <div className="font-terminal text-sm text-[#666]">
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="pixel-border bg-[#0d1117] p-4">
          <div className="font-pixel text-[10px] text-[#666] mb-2">
            TOTAL REGISTERED USERS
          </div>
          <div className="font-terminal text-3xl text-[#00ff41]">
            {totalUsers}
          </div>
          <div className="font-terminal text-xs text-[#ffb000] mt-1">
            Admins: {allUsers.filter((u) => u.role === "admin").length} | Participants: {allUsers.filter((u) => u.role === "participant").length}
          </div>
        </div>

        {roundStats.map((stat) => (
          <div key={stat.round} className="pixel-border bg-[#0d1117] p-4">
            <div className="font-pixel text-[10px] text-[#666] mb-2">
              ROUND {stat.round}
            </div>
            <div className="font-terminal text-3xl text-[#ffb000]">
              {stat.completed}/{stat.total}
            </div>
            <div className="font-terminal text-xs text-[#666] mt-1">
              Avg Score: {stat.avgScore}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["overview", "schedule", "users", "attempts", "cheats", "timelines"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pixel-btn text-xs ${
              activeTab === tab
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
        <div className="mb-4 p-3 bg-[#1a472a] border border-[#00ff41] font-terminal text-sm text-[#00ff41] rounded">
          {saveStatus}
        </div>
      )}

      {/* Tab Content */}
      <div className="pixel-border bg-[#0d1117] p-4">
        {activeTab === "schedule" && (
          <div>
            <h2 className="font-pixel text-sm text-[#00ff41] mb-2">
              ROUND UNLOCK SCHEDULE & EVENT TIMINGS
            </h2>
            <p className="font-terminal text-xs text-[#ffb000] mb-6">
              Set the exact date, time, and active status for each round. Participants who finish early will see a countdown popup until the scheduled unlock time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((num) => {
                const roundInfo = rounds.find((r) => r.number === num) || {
                  number: num,
                  title: `Round ${num}`,
                  unlock_date: new Date().toISOString(),
                  is_active: true,
                };

                // Convert ISO date to datetime-local input format YYYY-MM-DDTHH:mm
                const formattedDateStr = roundInfo.unlock_date
                  ? new Date(roundInfo.unlock_date).toISOString().slice(0, 16)
                  : new Date().toISOString().slice(0, 16);

                return (
                  <div key={num} className="border border-[#1a472a] bg-[#0a0a0a] p-4 rounded">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-pixel text-sm text-[#00ff41]">
                        ROUND {num}
                      </span>
                      <span
                        className={`font-terminal text-xs px-2 py-1 ${
                          roundInfo.is_active
                            ? "bg-[#00ff41]/20 text-[#00ff41]"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {roundInfo.is_active ? "ACTIVE" : "LOCKED"}
                      </span>
                    </div>

                    <div className="space-y-4 font-terminal text-xs">
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
                          const isoDate = new Date(dateVal).toISOString();
                          handleUpdateRoundSchedule(num, isoDate, activeVal);
                        }}
                        className="pixel-btn text-xs w-full bg-[#00ff41] text-black font-bold py-2 mt-2"
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
            <h2 className="font-pixel text-sm text-[#00ff41] mb-4 flex items-center justify-between">
              <span>REGISTERED USERS & ROLES</span>
              <span className="text-xs text-[#ffb000] font-terminal font-normal">
                Admins checked from Supabase `admins` table & `users` role column
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-sm">
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
                          <td className="py-2 font-mono text-xs text-[#666]">
                            {u.id}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 text-xs font-bold ${
                                u.role === "admin"
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
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
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
            <h2 className="font-pixel text-sm text-[#00ff41] mb-4">
              USER PROGRESS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-sm">
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
                  {allProgress.map((p, i) => (
                    <tr key={i} className="border-b border-[#1a472a]/50">
                      <td className="py-2 text-[#00ff41]">
                        {p.users?.email || p.user_id}
                      </td>
                      <td className="py-2 text-[#ffb000]">
                        Round {p.round_id}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 text-xs ${
                            p.status === "completed"
                              ? "bg-[#00ff41]/20 text-[#00ff41]"
                              : p.status === "in_progress"
                                ? "bg-[#ffb000]/20 text-[#ffb000]"
                                : "bg-[#666]/20 text-[#666]"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 text-[#00ff41]">
                        {p.score || "-"}
                      </td>
                      <td className="py-2 text-[#666]">
                        {p.completed_at
                          ? new Date(p.completed_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "attempts" && (
          <div>
            <h2 className="font-pixel text-sm text-[#00ff41] mb-4">
              FLAG ATTEMPTS
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-sm">
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
                  {allAttempts.map((a, i) => (
                    <tr key={i} className="border-b border-[#1a472a]/50">
                      <td className="py-2 text-[#00ff41]">
                        {a.users?.email || "-"}
                      </td>
                      <td className="py-2 text-[#ffb000]">
                        Round {a.round_id}
                      </td>
                      <td className="py-2 text-[#666] font-mono text-xs max-w-xs truncate">
                        {a.flag}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 text-xs ${
                            a.correct
                              ? "bg-[#00ff41]/20 text-[#00ff41]"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {a.correct ? "CORRECT" : "WRONG"}
                        </span>
                      </td>
                      <td className="py-2 text-[#666]">
                        {new Date(a.submitted_at).toLocaleString()}
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
            <h2 className="font-pixel text-sm text-red-500 mb-4">
              CHEATING ATTEMPTS
            </h2>
            {cheatAttempts.length === 0 ? (
              <div className="font-terminal text-[#666] text-center py-8">
                No cheating attempts detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-terminal text-sm">
                  <thead>
                    <tr className="border-b border-[#1a472a]">
                      <th className="text-left py-2 text-[#666]">Submitter</th>
                      <th className="text-left py-2 text-[#666]">Flag Owner</th>
                      <th className="text-left py-2 text-[#666]">Round</th>
                      <th className="text-left py-2 text-[#666]">Status</th>
                      <th className="text-left py-2 text-[#666]">Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheatAttempts.map((c, i) => (
                      <tr key={i} className="border-b border-[#1a472a]/50">
                        <td className="py-2 text-red-500">
                          {c.submitter_id}
                        </td>
                        <td className="py-2 text-[#ffb000]">
                          {c.owner_id}
                        </td>
                        <td className="py-2 text-[#666]">
                          Round {c.round_id}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500">
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 text-[#666]">
                          {new Date(c.detected_at).toLocaleString()}
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
            <h2 className="font-pixel text-sm text-[#00ff41] mb-4">
              TIMELINE SUBMISSIONS (ROUND 3)
            </h2>
            {timelineSubmissions.length === 0 ? (
              <div className="font-terminal text-[#666] text-center py-8">
                No timeline submissions yet.
              </div>
            ) : (
              <div className="space-y-4">
                {timelineSubmissions.map((t, i) => (
                  <div
                    key={i}
                    className="border border-[#1a472a] p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-pixel text-xs text-[#00ff41]">
                        {t.users?.email || "Unknown"}
                      </span>
                      <span className="font-terminal text-xs text-[#666]">
                        {new Date(t.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <pre className="font-terminal text-sm text-[#ffb000] whitespace-pre-wrap">
                      {t.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
