"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProgress, Round } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { PixelLock, PixelUnlock, PixelProgressSprite, PixelSoldier } from "@/components/pixel-art";
import { StoryReveal } from "@/components/story/StoryReveal";
import { EventBriefing } from "@/components/info/EventBriefing";
import { storyChapters } from "@/data/story";

interface DaySelectionProps {
  progress: UserProgress[];
  rounds: Round[];
}

export function DaySelectionClient({ progress, rounds }: DaySelectionProps) {
  const router = useRouter();
  const [now, setNow] = useState<number>(0);
  const [activeStory, setActiveStory] = useState<number | null>(null);
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const completedRounds = progress
    .filter((p) => p.status === "completed")
    .map((p) => p.round_id);

  const renderBox = (dayNum: number) => {
    const roundInfo = rounds.find((r) => r.number === dayNum);
    const isCompleted = completedRounds.includes(dayNum);
    const isPrevCompleted = dayNum === 1 || completedRounds.includes(dayNum - 1);
    
    let isUnlockedTime = false;
    let unlockTimeMs = 0;
    
    if (roundInfo) {
      unlockTimeMs = new Date(roundInfo.unlock_date).getTime();
      isUnlockedTime = roundInfo.is_active && (now === 0 ? false : unlockTimeMs <= now);
    }
    
    // If not prev completed, or completed, or canplay, or time locked
    let state: "completed" | "playable" | "locked_time" | "locked_prev" = "locked_prev";
    
    if (isCompleted) state = "completed";
    else if (!isPrevCompleted) state = "locked_prev";
    else if (!isUnlockedTime) state = "locked_time";
    else state = "playable";

    let bgClass = "bg-[#0d1117]/80 border-[#666] border-[6px] border-double opacity-80 backdrop-blur-sm";
    let textClass = "text-[#666]";
    let icon = <PixelLock />;
    
    if (state === "playable") {
      bgClass = "bg-[#00ff41]/20 border-[#00ff41] border-[6px] border-solid pixel-shadow cursor-pointer hover:bg-[#00ff41]/30 hover:scale-105 transition-all backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,65,0.3)]";
      textClass = "text-[#00ff41]";
      icon = <PixelUnlock />;
    } else if (state === "completed") {
      bgClass = "bg-[#1a472a]/60 border-[#00ff41] border-[6px] border-solid pixel-shadow cursor-pointer hover:bg-[#1a472a]/80 hover:scale-105 transition-all backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,65,0.3)]";
      textClass = "text-[#00ff41]";
      icon = <PixelProgressSprite round={dayNum} />;
    }

    const handleSelect = () => {
      if (state === "playable" || state === "completed") {
        router.push(`/game?day=${dayNum}`);
      }
    };

    let content = null;
    if (state === "locked_time") {
      const diff = unlockTimeMs - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        content = (
          <div className="mt-4 text-xs text-[#ffb000] bg-black/50 p-2 border border-[#ffb000]">
            UNLOCKS IN:<br/>
            {d > 0 ? `${d}d ` : ""}{h}h {m}m {s}s
          </div>
        );
      } else {
        content = <div className="mt-4 text-sm font-pixel text-red-500 animate-pulse bg-black/60 p-2 border border-red-500">LOCKED BY ADMIN</div>;
      }
    } else if (state === "locked_prev") {
      content = <div className="mt-4 text-xs text-[#888] bg-black/40 p-2">Complete Day {dayNum - 1} First</div>;
    } else if (state === "completed") {
      const score = progress.find(p => p.round_id === dayNum)?.score;
      content = (
        <div className="mt-4 text-xs text-[#00ff41] bg-[#00ff41]/10 p-2 border border-[#00ff41]/50 w-full">
          <div className="font-bold mb-1">MISSION ACCOMPLISHED</div>
          Score: {score}
        </div>
      );
    } else if (state === "playable") {
      content = (
        <div className="mt-4 text-xs text-black font-bold bg-[#00ff41] p-2 w-full animate-pulse">
          AVAILABLE TO PLAY
        </div>
      );
    }

    const storyUnlocked = isCompleted;
    const storyChapter = storyChapters[dayNum];

    return (
      <div key={dayNum} className="flex flex-col gap-6">
        {/* Day box */}
        <div
          onClick={handleSelect}
          className={`p-6 flex flex-col items-center justify-center text-center w-full h-64 ${bgClass}`}
        >
          <div className="mb-4">
            {icon}
          </div>
          <h2 className={`font-pixel text-xl ${textClass}`}>DAY {dayNum}</h2>
          <div className={`font-terminal text-sm mt-2 mb-2 ${textClass === 'text-[#666]' ? 'text-[#888]' : 'text-white'}`}>
            {roundInfo?.title?.toUpperCase() || `MISSION ${dayNum}`}
          </div>
          {content}
        </div>

        {/* Story box */}
        <div
          onClick={() => {
            if (storyUnlocked) setActiveStory(dayNum);
          }}
          className={`group relative flex flex-col items-center justify-between px-5 py-6 text-center border-2 min-h-[148px] transition-all duration-300 backdrop-blur-sm ${
            storyUnlocked
              ? "border-[#6b5d3e]/70 bg-[#0d0b07]/80 cursor-pointer hover:border-[#b8a05a] hover:bg-[#b8a05a]/10 shadow-[0_0_18px_rgba(184,160,90,0.15)]"
              : "border-[#3a3427]/60 bg-[#0a0906]/60 opacity-60"
          }`}
        >
          {storyUnlocked ? (
            <>
              <div className="font-royal text-[10px] tracking-[0.4em] text-[#00ff41]/70">
                STORY — DAY {dayNum}
              </div>
              <div className="font-royal text-lg font-semibold text-[#ece3cf]">
                {storyChapter?.title}
              </div>
              <div className="h-px w-14 bg-gradient-to-r from-transparent via-[#b8a05a]/80 to-transparent" />
              <div className="font-royal-serif text-sm italic leading-relaxed text-[#cfc2a4]/90">
                {storyChapter?.lines[0]}
              </div>
              <div className="font-royal text-[10px] tracking-[0.35em] text-[#b8a05a] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                PLAY STORY &rsaquo;
              </div>
            </>
          ) : (
            <>
              <div className="font-royal text-[10px] tracking-[0.4em] text-[#00ff41]/40">
                STORY — DAY {dayNum}
              </div>
              <div className="font-royal text-lg font-semibold text-[#7a6f55]">
                {storyChapter?.title}
              </div>
              <div className="h-px w-14 bg-[#3a3427]" />
              <div className="font-royal-serif text-sm italic text-[#6d6350]">
                {storyUnlocked ? storyChapter?.lines[0] : "Classified. Recover the flag to unlock this chapter."}
              </div>
              <div className="flex items-center gap-2 font-royal text-[10px] tracking-[0.35em] text-[#6d6350]">
                <span className="inline-block h-2 w-2 border border-[#6d6350] rounded-full" />
                LOCKED
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const activeChapter = activeStory ? storyChapters[activeStory] : null;

  return (
    <>
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/pixel_bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'multiply',
        backgroundColor: 'rgba(10, 10, 10, 0.85)'
      }}
    >
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      
      <div className="w-full max-w-4xl relative z-10">
        <div className="flex flex-col items-center mb-10 bg-black/60 p-6 border-[4px] border-[#1a472a] shadow-xl">
          <PixelSoldier />
          <h1 className="font-pixel text-2xl text-[#00ff41] text-center mt-4 glow-pulse">
            SELECT MISSION DAY
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(renderBox)}
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push("/leaderboard")}
            className="pixel-btn text-xs bg-[#1a472a] text-[#00ff41] border border-[#00ff41]/50 px-4 py-2 hover:bg-[#00ff41] hover:text-black"
          >
            LEADERBOARD
          </button>
          <button
            onClick={() => setShowBriefing(true)}
            className="pixel-btn text-xs bg-[#1a472a] text-[#00ff41] border border-[#00ff41]/50 px-4 py-2 hover:bg-[#00ff41] hover:text-black"
          >
            EVENT BRIEFING
          </button>
          <button
            onClick={() => {
              createClient().auth.signOut().then(() => {
                router.push("/");
                router.refresh();
              });
            }}
            className="pixel-btn text-xs bg-red-900/50 text-red-500 border border-red-500 px-4 py-2 hover:bg-red-900"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
    {activeChapter && (
      <StoryReveal chapter={activeChapter} onComplete={() => setActiveStory(null)} />
    )}
    {showBriefing && <EventBriefing onClose={() => setShowBriefing(false)} />}
    </>
  );
}
