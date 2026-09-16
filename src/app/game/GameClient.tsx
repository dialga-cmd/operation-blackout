"use client";

import { useState, useEffect, useCallback } from "react";
import { Terminal } from "@/components/terminal/Terminal";
import { PixelSoldier, PixelProgressSprite } from "@/components/pixel-art";
import { StoryReveal } from "@/components/story/StoryReveal";
import { storyChapters } from "@/data/story";
import { UserProgress, Round, VFSRound } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GameClientProps {
  userId: string;
  currentRound: number;
  nextRoundUnlockDate?: string | null;
  progress: UserProgress[];
  rounds: Round[];
}

export function GameClient({
  userId,
  currentRound,
  nextRoundUnlockDate,
  progress,
  rounds,
}: GameClientProps) {
  const [roundData, setRoundData] = useState<VFSRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStory, setPendingStory] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (currentRound === 0 && nextRoundUnlockDate) {
      const targetTime = new Date(nextRoundUnlockDate).getTime();

      const updateCountdown = () => {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
          setCountdownText("Unlocking now... Refresh page!");
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setCountdownText(`${days} days, ${hours} hours and ${minutes} mins`);
        } else {
          setCountdownText(`${hours} hours, ${minutes} mins and ${seconds} secs`);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRound, nextRoundUnlockDate]);

  const fetchRoundData = useCallback(
    async (round: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/vfs/${round}?userId=${userId}`);
        if (!res.ok) {
          console.error(`VFS fetch failed: ${res.status}`);
          setRoundData(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setRoundData(data);
      } catch (error) {
        console.error("Failed to load round data:", error);
        setRoundData(null);
      }
      setLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    if (currentRound > 0) {
      fetchRoundData(currentRound);
    }
  }, [currentRound, fetchRoundData]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleFlagSubmit = async (
    flag: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/flag/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, roundId: currentRound, userId }),
      });

      const data = await res.json();

      if (data.success) {
        setPendingStory(currentRound);
      }

      return data;
    } catch {
      return {
        success: false,
        message: "ERROR: Flag submission failed. Try again.",
      };
    }
  };

  if (currentRound === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] noise-bg p-4">
        <div className="pixel-border pixel-shadow bg-[#0d1117] p-8 text-center max-w-lg w-full">
          <PixelSoldier />
          <h2 className="font-pixel text-xl text-[#ffb000] mt-6 mb-4">
            NEXT ROUND LOCKED
          </h2>
          <p className="font-terminal text-lg text-[#00ff41] mb-2">
            You completed the previous challenge!
          </p>
          <div className="bg-[#1a472a]/40 border border-[#00ff41] p-4 rounded my-4">
            <p className="font-pixel text-xs text-[#ffb000] mb-2">
              COUNTDOWN TO NEXT ROUND
            </p>
            <p className="font-terminal text-2xl text-[#00ff41] animate-pulse">
              {countdownText || "Calculating unlock time..."}
            </p>
          </div>
          <p className="font-terminal text-xs text-[#666] mt-4">
            The organizer has locked this round until the scheduled event start time.
          </p>
          <button
            onClick={() => router.refresh()}
            className="pixel-btn text-xs bg-[#00ff41] text-black font-bold mt-6 px-6 py-2"
          >
            REFRESH STATUS
          </button>
        </div>
      </div>
    );
  }

  const storyChapter = pendingStory ? storyChapters[pendingStory] : null;
  const isStoryActive = pendingStory !== null;

  return (
    <>
      <div
        className={`min-h-screen flex flex-col bg-[#0a0a0a] noise-bg transition-opacity duration-[1600ms] ease-in-out ${
          isStoryActive ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#1a472a]">
          <div className="flex items-center gap-4">
            <Link href="/game" className="font-pixel text-sm text-[#00ff41] hover:text-[#ffb000] transition-colors cursor-pointer">
              OPERATION BLACKOUT
            </Link>
            <div className="h-4 w-px bg-[#1a472a]" />
            <span className="font-terminal text-sm text-[#ffb000]">
              Round {currentRound}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress indicators */}
            {rounds.map((round) => {
              const roundProgress = progress.find(
                (p) => p.round_id === round.number
              );
              const isCompleted = roundProgress?.status === "completed";
              const isCurrent = round.number === currentRound;

              return (
                <div
                  key={round.number}
                  className={`flex items-center gap-2 px-3 py-1 ${
                    isCurrent
                      ? "bg-[#1a472a]/50 border border-[#00ff41]"
                      : isCompleted
                        ? "bg-[#00ff41]/10"
                        : "bg-[#333]/30"
                  }`}
                >
                  <PixelProgressSprite
                    round={isCompleted ? round.number : 0}
                  />
                  <span
                    className={`font-pixel text-[10px] ${
                      isCompleted
                        ? "text-[#00ff41]"
                        : isCurrent
                          ? "text-[#ffb000]"
                          : "text-[#666]"
                    }`}
                  >
                    R{round.number}
                  </span>
                </div>
              );
            })}

            <button
              onClick={handleLogout}
              className="font-pixel text-[9px] text-[#ffb000] hover:text-red-500 transition-colors px-2 py-1 border border-[#1a472a] hover:border-red-500"
            >
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Main Terminal Area */}
        <div className="flex-1 flex">
          {/* Terminal */}
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
                <div className="font-terminal text-[#00ff41] animate-pulse text-xl">
                  Loading filesystem...
                </div>
              </div>
            ) : roundData ? (
              <Terminal
                roundData={roundData}
                roundId={currentRound}
                userId={userId}
                onFlagSubmit={handleFlagSubmit}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
                <div className="font-terminal text-red-500 text-xl">
                  Failed to load round data.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {storyChapter && (
        <StoryReveal chapter={storyChapter} onComplete={() => router.push("/game")} />
      )}
    </>
  );
}
