"use client";

import { Terminal } from "@/components/terminal/Terminal";
import { randomizeRoundVFS } from "@/lib/vfs/randomizer";
import { roundVFSMap } from "@/data/rounds";
import { generateFlagKey, getTodayDate } from "@/lib/crypto/flag-key";

const userId = "e9ab664e-eb2a-4fc0-8b2b-060946a2af9f";
const key = generateFlagKey(userId, 1, getTodayDate());
const roundData = randomizeRoundVFS(roundVFSMap[1], userId, key);

export default function DevTerminalPage() {
  return (
    <div style={{ height: "100vh" }}>
      <Terminal
        roundData={roundData}
        roundId={1}
        userId={userId}
        onFlagSubmit={async () => ({ success: true, message: "ok" })}
      />
    </div>
  );
}
