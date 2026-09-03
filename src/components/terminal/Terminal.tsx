"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VFSEngine } from "@/lib/vfs/engine";
import { executePipeline } from "@/lib/vfs/executor";
import { SessionState, VFSRound } from "@/lib/types";
import { PixelNarrator } from "@/components/pixel-art";

interface TerminalProps {
  roundData: VFSRound;
  roundId: number;
  userId: string;
  onFlagSubmit: (flag: string) => Promise<{ success: boolean; message: string }>;
}

interface TerminalHistoryEntry {
  id: string;
  prompt: string;
  command: string;
  output: string;
}

export function Terminal({ roundData, roundId, userId, onFlagSubmit }: TerminalProps) {
  const [terminalHistory, setTerminalHistory] = useState<TerminalHistoryEntry[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [session, setSession] = useState<SessionState>(() => {
    const baseEnv: Record<string, string> = {
      USER: "participant",
      HOME: "/home/participant",
      PATH: "/usr/local/bin:/usr/bin:/bin",
      SHELL: "/bin/bash",
      HOSTNAME: "operation-blackout",
      ROUND: String(roundId),
    };

    if (roundId === 2) {
      baseEnv.SESSION_TOKEN = "ZmxhZ3toaWRkZW5faW5fcGxhaW5fcGVybWlzc2lvbnN9";
      baseEnv.BACKUP_KEY = "aW5jaWRlbnRfYWNjZXNzX2RldGVjdGVk";
    }
    if (roundId === 3) {
      baseEnv.INVESTIGATION_PATH = "/var/log/.incidents";
    }

    return {
      cwd: "/",
      env: baseEnv,
      history: [],
      scratchSpace: {},
      userId,
      roundId,
    };
  });

  const [vfs] = useState(() => new VFSEngine(roundData));
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [terminalHistory, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getPrompt = () => {
    const dir = session.cwd === "/home/participant" ? "~" :
      session.cwd.startsWith("/home/participant/") ?
        "~" + session.cwd.slice("/home/participant".length) :
        session.cwd;
    return `root@blackout:${dir}# `;
  };

  const processCommand = async (input: string) => {
    const currentPrompt = getPrompt();
    const entryId = Math.random().toString(36).substring(2, 9);

    if (input.trim() === "") {
      setTerminalHistory((prev) => [
        ...prev,
        { id: entryId, prompt: currentPrompt, command: "", output: "" },
      ]);
      return;
    }

    // Handle timeline command
    if (input.trim().toLowerCase().startsWith("timeline")) {
      const content = input.trim().slice("timeline".length).trim();
      if (!content) {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: entryId,
            prompt: currentPrompt,
            command: input,
            output: "\x1b[1;33mUsage: timeline <your 4-6 line investigation summary>\x1b[0m",
          },
        ]);
        return;
      }
      setIsProcessing(true);
      try {
        const res = await fetch("/api/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, userId, content }),
        });
        const data = await res.json();
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: entryId,
            prompt: currentPrompt,
            command: input,
            output: data.success
              ? `\x1b[1;32m${data.message}\x1b[0m`
              : `\x1b[1;31m${data.message || "Failed to submit timeline."}\x1b[0m`,
          },
        ]);
      } catch {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: entryId,
            prompt: currentPrompt,
            command: input,
            output: "\x1b[1;31mERROR: Timeline submission failed.\x1b[0m",
          },
        ]);
      }
      setIsProcessing(false);
      return;
    }

    // Handle submit command
    if (input.trim().startsWith("submit ")) {
      const flag = input.trim().slice(7).trim();
      setIsProcessing(true);

      setTerminalHistory((prev) => [
        ...prev,
        {
          id: entryId,
          prompt: currentPrompt,
          command: input,
          output: "\x1b[1;33m[*] Validating flag submission with central server...\x1b[0m",
        },
      ]);

      try {
        const result = await onFlagSubmit(flag);
        setTerminalHistory((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  output: result.success
                    ? `\x1b[1;32m${result.message}\x1b[0m`
                    : `\x1b[1;31m${result.message}\x1b[0m`,
                }
              : item
          )
        );
      } catch {
        setTerminalHistory((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  output: "\x1b[1;31mERROR: Flag submission failed. Try again.\x1b[0m",
                }
              : item
          )
        );
      }

      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 40));

    const result = executePipeline(input, vfs, session);

    if (result.clear) {
      setTerminalHistory([]);
      setIsProcessing(false);
      return;
    }

    setSession(result.session);
    setCommandHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    setTerminalHistory((prev) => [
      ...prev,
      {
        id: entryId,
        prompt: currentPrompt,
        command: input,
        output: result.output || "",
      },
    ]);

    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isProcessing) {
      processCommand(currentInput);
      setCurrentInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ?
          historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setCurrentInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setTerminalHistory([]);
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      const currentPrompt = getPrompt();
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          prompt: currentPrompt,
          command: `${currentInput}^C`,
          output: "",
        },
      ]);
      setCurrentInput("");
    }
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // Keep terminal input focused continuously (real terminal behavior)
  useEffect(() => {
    const keepFocus = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    keepFocus();
    window.addEventListener("focus", keepFocus);
    window.addEventListener("keydown", keepFocus);

    return () => {
      window.removeEventListener("focus", keepFocus);
      window.removeEventListener("keydown", keepFocus);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#1a472a] select-none">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
        <div className="w-3 h-3 bg-green-500 rounded-full" />
        <span className="font-terminal text-base text-[#8b949e] ml-2">
          root@operation-blackout: bash — Round {roundId}
        </span>
      </div>

      {/* Narrator Message */}
      {roundId === 1 && terminalHistory.length === 0 && (
        <PixelNarrator
          message={`At 02:17 AM, someone breached this server. The logs are gone, but traces remain in the filesystem. Start by looking for recent files. Use 'find' to discover what was modified.`}
        />
      )}
      {roundId === 2 && terminalHistory.length === 0 && (
        <PixelNarrator
          message={`The trail continues, but it's obscured. Permissions are locked, data is encoded. Check environment variables, history files, and cron jobs. Nothing is what it seems.`}
        />
      )}
      {roundId === 3 && terminalHistory.length === 0 && (
        <PixelNarrator
          message={`This system looks clean — almost too clean. Look for file type mismatches, extract nested archives, and correlate logs. The attacker left their last trace here.`}
        />
      )}

      {/* Terminal Output Body */}
      <div
        ref={outputRef}
        onClick={handleTerminalClick}
        className="flex-1 overflow-y-auto p-4 font-terminal text-[20px] leading-relaxed text-[#00ff41] bg-[#0d1117] cursor-text"
      >
        {/* Welcome message */}
        {terminalHistory.length === 0 && (
          <div className="text-[#8b949e] mb-4 space-y-1">
            <p>Linux operation-blackout 5.15.0 #1 SMP {new Date().toDateString()}</p>
            <p>Last login: {new Date().toLocaleString()}</p>
            <p>Type &apos;help&apos; for available commands.</p>
            <p className="text-[#ffb000]">Use &apos;submit FLAG&lbrace;...&rbrace;&apos; to submit your flag.</p>
          </div>
        )}

        {/* History + Output */}
        {terminalHistory.map((item) => (
          <div key={item.id} className="mb-2">
            <div className="text-[#00ff41] font-semibold">
              {item.prompt}{item.command}
            </div>
            {item.output ? (
              <pre className="whitespace-pre-wrap text-[#00ff41]/90 font-terminal text-[20px] leading-normal my-1">
                {item.output}
              </pre>
            ) : null}
          </div>
        ))}

        {/* Current Prompt + Typing Line */}
        <div className="flex items-center flex-wrap">
          <span className="text-[#00ff41] font-semibold whitespace-pre select-none">
            {getPrompt()}
          </span>
          <div className="relative flex-1 flex items-center min-w-[200px]">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => inputRef.current?.focus(), 10)}
              className="terminal-input w-full"
              disabled={isProcessing}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
