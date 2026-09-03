import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { PixelSoldier } from "@/components/pixel-art";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/game");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] noise-bg relative overflow-hidden">
      {/* Background pixel soldiers */}
      <div className="absolute top-10 left-10 opacity-20">
        <PixelSoldier direction="right" />
      </div>
      <div className="absolute top-20 right-16 opacity-20">
        <PixelSoldier direction="left" />
      </div>
      <div className="absolute bottom-20 left-20 opacity-20">
        <PixelSoldier direction="right" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20">
        <PixelSoldier direction="left" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-pixel text-2xl md:text-4xl text-[#00ff41] glow-pulse mb-4">
            OPERATION BLACKOUT
          </h1>
          <div className="w-full h-1 bg-[#1a472a] mb-4" />
          <p className="font-terminal text-xl md:text-2xl text-[#ffb000]">
            INCIDENT RESPONSE SIMULATION
          </p>
        </div>

        {/* Terminal Frame */}
        <div className="pixel-border pixel-shadow bg-[#0d1117] p-6 w-full max-w-lg">
          <div className="flex items-center gap-2 mb-4 border-b border-[#1a472a] pb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="font-terminal text-sm text-[#666] ml-2">
              operation-blackout — secure terminal
            </span>
          </div>

          <div className="font-terminal text-[#00ff41] text-lg mb-6 space-y-2">
            <p className="typing-effect">{`> At 02:17 AM, the breach was detected.`}</p>
            <p className="typing-effect">{`> Files deleted. Logs tampered. Artifacts planted.`}</p>
            <p className="typing-effect">{`> Your mission: Investigate the intrusion.`}</p>
            <p className="text-[#ffb000] mt-4">{`> Authenticate to begin.`}</p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <div className="font-pixel text-[8px] text-[#333] text-center mt-8">
          <p>CLASSIFIED — AUTHORIZED PERSONNEL ONLY</p>
          <p className="mt-1">SIMULATION v1.0 — NO REAL SYSTEMS AT RISK</p>
        </div>
      </div>
    </div>
  );
}
