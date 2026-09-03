"use client";

export function PixelNarrator({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="relative flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 16 16" className="pixel-bounce">
          {/* Hair */}
          <rect x="4" y="1" width="8" height="2" fill="#1a1a2e" />
          <rect x="3" y="2" width="1" height="3" fill="#1a1a2e" />
          <rect x="12" y="2" width="1" height="3" fill="#1a1a2e" />
          {/* Head */}
          <rect x="4" y="3" width="8" height="6" fill="#d4a574" />
          {/* Eyes */}
          <rect x="5" y="5" width="2" height="2" fill="#fff" />
          <rect x="9" y="5" width="2" height="2" fill="#fff" />
          <rect x="6" y="5" width="1" height="2" fill="#1a1a2e" />
          <rect x="10" y="5" width="1" height="2" fill="#1a1a2e" />
          {/* Mouth */}
          <rect x="6" y="8" width="4" height="1" fill="#8b4513" />
          {/* Body - Tactical Vest */}
          <rect x="3" y="9" width="10" height="5" fill="#2d5016" />
          <rect x="5" y="9" width="2" height="2" fill="#3d6b1e" />
          <rect x="9" y="9" width="2" height="2" fill="#3d6b1e" />
          {/* Badge */}
          <rect x="7" y="10" width="2" height="2" fill="#ffb000" />
          {/* Arms */}
          <rect x="1" y="10" width="2" height="3" fill="#d4a574" />
          <rect x="13" y="10" width="2" height="3" fill="#d4a574" />
          {/* Legs */}
          <rect x="4" y="14" width="3" height="2" fill="#1a1a2e" />
          <rect x="9" y="14" width="3" height="2" fill="#1a1a2e" />
        </svg>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </div>
      <div className="bg-[#1a472a]/30 border border-[#1a472a] p-3 font-terminal text-lg text-[#00ff41] max-w-md">
        <div className="text-[10px] text-[#ffb000] mb-1 font-pixel">SYSTEM ADMIN</div>
        {message}
      </div>
    </div>
  );
}

export function PixelSoldier({ direction = "right" }: { direction?: "left" | "right" }) {
  const flip = direction === "left" ? "scale(-1, 1)" : "";
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ transform: flip }}>
      {/* Helmet */}
      <rect x="4" y="0" width="8" height="3" fill="#3d3d3d" />
      <rect x="3" y="2" width="10" height="2" fill="#4a4a4a" />
      {/* Face */}
      <rect x="5" y="4" width="6" height="3" fill="#d4a574" />
      {/* Eyes */}
      <rect x="6" y="5" width="1" height="1" fill="#000" />
      <rect x="9" y="5" width="1" height="1" fill="#000" />
      {/* Body */}
      <rect x="3" y="7" width="10" height="4" fill="#2d5016" />
      {/* Gear */}
      <rect x="4" y="8" width="2" height="2" fill="#3d3d3d" />
      <rect x="10" y="8" width="2" height="2" fill="#3d3d3d" />
      {/* Legs */}
      <rect x="4" y="11" width="3" height="3" fill="#1a1a2e" />
      <rect x="9" y="11" width="3" height="3" fill="#1a1a2e" />
      {/* Boots */}
      <rect x="3" y="14" width="4" height="2" fill="#2d2d2d" />
      <rect x="9" y="14" width="4" height="2" fill="#2d2d2d" />
    </svg>
  );
}

export function PixelProgressSprite({ round }: { round: number }) {
  const colors = ["#ff0040", "#ffb000", "#00ff41"];
  const color = colors[Math.min(round - 1, 2)];

  return (
    <svg width="48" height="48" viewBox="0 0 16 16" className="pixel-bounce">
      {/* Shield */}
      <rect x="3" y="1" width="10" height="12" fill={color} rx="1" />
      <rect x="4" y="2" width="8" height="10" fill="#0d1117" />
      {/* Round Number */}
      <rect x="6" y="4" width="4" height="4" fill={color} />
      <rect x="7" y="5" width="2" height="2" fill="#fff" />
      {/* Check or Lock */}
      {round > 0 && (
        <>
          <rect x="6" y="10" width="1" height="1" fill={color} />
          <rect x="7" y="11" width="1" height="1" fill={color} />
          <rect x="8" y="10" width="1" height="1" fill={color} />
          <rect x="9" y="9" width="1" height="1" fill={color} />
          <rect x="10" y="8" width="1" height="1" fill={color} />
        </>
      )}
    </svg>
  );
}

export function PixelLock() {
  return (
    <svg width="24" height="24" viewBox="0 0 12 12">
      <rect x="2" y="5" width="8" height="6" fill="#666" />
      <rect x="3" y="6" width="6" height="4" fill="#444" />
      <rect x="4" y="2" width="4" height="4" fill="none" stroke="#666" strokeWidth="1.5" />
      <rect x="5" y="7" width="2" height="2" fill="#ffb000" />
    </svg>
  );
}

export function PixelUnlock() {
  return (
    <svg width="24" height="24" viewBox="0 0 12 12">
      <rect x="2" y="5" width="8" height="6" fill="#00ff41" />
      <rect x="3" y="6" width="6" height="4" fill="#0d1117" />
      <rect x="5" y="7" width="2" height="2" fill="#00ff41" />
      <rect x="4" y="2" width="4" height="4" fill="none" stroke="#00ff41" strokeWidth="1.5" />
    </svg>
  );
}
