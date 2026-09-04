import Link from "next/link";
import { PixelSoldier } from "@/components/pixel-art";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] noise-bg relative overflow-hidden">
      {/* Background pixel soldiers */}
      <div className="absolute top-10 right-10 opacity-20">
        <PixelSoldier direction="left" />
      </div>
      <div className="absolute bottom-20 left-10 opacity-20">
        <PixelSoldier direction="right" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        <div className="text-center">
          <h1 className="font-pixel text-4xl md:text-6xl text-red-500 glow-pulse mb-4">
            404
          </h1>
          <div className="w-full h-1 bg-[#1a472a] mb-4" />
          <p className="font-terminal text-xl md:text-2xl text-[#ffb000]">
            SECTOR NOT FOUND
          </p>
        </div>

        <div className="pixel-border pixel-shadow bg-[#0d1117] p-8 w-full max-w-lg text-center">
          <div className="font-terminal text-[#00ff41] text-lg mb-8 space-y-4">
            <p>{`> Error: 404_PAGE_NOT_FOUND`}</p>
            <p>{`> The requested file or directory does not exist on this node.`}</p>
            <p className="text-[#ffb000] mt-4">{`> Trace route failed. Connection dropped.`}</p>
          </div>

          <Link
            href="/"
            className="pixel-btn inline-block text-sm px-6 py-3"
          >
            RETURN TO BASE
          </Link>
        </div>
      </div>
    </div>
  );
}
