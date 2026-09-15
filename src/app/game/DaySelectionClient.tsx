"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProgress, Round } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { PixelLock, PixelUnlock, PixelProgressSprite, PixelSoldier } from "@/components/pixel-art";

interface DaySelectionProps {
  progress: UserProgress[];
  rounds: Round[];
}

export function DaySelectionClient({ progress, rounds }: DaySelectionProps) {
  const router = useRouter();
  const [now, setNow] = useState<number>(0);

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

    return (
      <div 
        key={dayNum} 
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
    );
  };

  return (
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
        <div className="mt-12 text-center">
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
  );
}
