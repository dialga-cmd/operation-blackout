"use client";

import { useEffect, useState } from "react";
import { EVENT_INFO } from "@/data/event";

interface EventBriefingProps {
  onClose: () => void;
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="h-px w-8 bg-[#00ff41]/60" />
      <h3 className="font-pixel text-[10px] tracking-wider text-[#ffb000]">
        {children}
      </h3>
      <span className="h-px flex-1 bg-[#00ff41]/20" />
    </div>
  );
}

export function EventBriefing({ onClose }: EventBriefingProps) {
  const [fadedIn, setFadedIn] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFadedIn(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-opacity duration-500 ${
        fadedIn ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundImage: "url('/pixel_bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "multiply",
        backgroundColor: "rgba(5, 5, 5, 0.94)",
      }}
    >
      <div className="absolute inset-0 bg-black/50 z-0"></div>

      <div className="relative z-10 w-full max-w-2xl max-h-[86vh] flex flex-col bg-[#0a0a0a]/95 border-[4px] border-double border-[#1a472a] pixel-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a472a] bg-[#0d1117]">
          <div>
            <div className="font-terminal text-xs tracking-[0.3em] text-[#00ff41]/70">
              JARVIS SOCIETY PRESENTS
            </div>
            <div className="font-pixel text-sm text-[#00ff41] mt-1">
              {EVENT_INFO.title}
            </div>
            <div className="font-terminal text-sm text-[#ffb000] tracking-[0.2em]">
              {EVENT_INFO.subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close briefing"
            className="font-pixel text-xs text-[#ff0040] border border-[#ff0040] px-3 py-2 hover:bg-[#ff0040]/20 transition-colors"
          >
            X
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 noise-bg">
          {/* Intro */}
          <p className="font-terminal text-lg leading-relaxed text-[#d8d8d8] mb-6 border-l-4 border-[#00ff41]/70 pl-3">
            {EVENT_INFO.intro}
          </p>

          {/* Event details */}
          <SectionHeader>EVENT DETAILS</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-6">
            {EVENT_INFO.details.map((d) => (
              <div key={d.label} className="flex flex-col">
                <span className="font-pixel text-[9px] text-[#00ff41]/80">
                  {d.label}
                </span>
                <span className="font-terminal text-base text-white">
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {/* Rules */}
          <SectionHeader>RULES</SectionHeader>
          <div className="flex flex-col gap-3 mb-6">
            {EVENT_INFO.rules.map((rule, i) => (
              <div
                key={rule.title}
                className="border border-[#1a472a]/60 bg-[#0d1117]/60 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-pixel text-[9px] text-[#ffb000]">
                    0{i + 1}
                  </span>
                  <span className="font-pixel text-[9px] text-[#00ff41] tracking-wider">
                    {rule.title}
                  </span>
                </div>
                <p className="font-terminal text-base leading-snug text-[#c8c8c8]">
                  {rule.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center px-5 py-4 border-t border-[#1a472a] bg-[#0d1117]">
          <button
            onClick={onClose}
            className="font-pixel text-xs bg-[#1a472a] text-[#00ff41] px-6 py-3 hover:bg-[#00ff41] hover:text-black transition-colors pixel-shadow"
          >
            RETURN TO COMMAND
          </button>
        </div>
      </div>
    </div>
  );
}