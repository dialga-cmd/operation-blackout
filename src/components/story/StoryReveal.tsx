"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoryChapter } from "@/data/story";

interface StoryRevealProps {
  chapter: StoryChapter;
  onComplete: () => void;
}

const TYPE_MS = 58;
const ERASE_MS = 24;
const PAUSE_BEFORE_ERASE = 800;
const PAUSE_BEFORE_NEXT = 450;
const PAUSE_AFTER_ALL = 3400;
const AUTO_RETURN_MS = 8000;

export function StoryReveal({ chapter, onComplete }: StoryRevealProps) {
  const [fadedIn, setFadedIn] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"typing" | "erasing" | "done">("typing");
  const [showReturn, setShowReturn] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (doneRef.current) return;

    if (phase === "done") {
      setShowReturn(true);
      return;
    }

    // Erasing: skip the delete animation and start the next line.
    if (phase === "erasing") {
      if (lineIndex >= chapter.lines.length - 1) {
        setPhase("done");
      } else {
        setLineIndex((i) => i + 1);
        setTyped(0);
        setPhase("typing");
      }
      return;
    }

    // Typing: skip the animation of this line only.
    const line = chapter.lines[lineIndex];
    if (typed < line.length) {
      setTyped(line.length);
    } else if (lineIndex === chapter.lines.length - 1) {
      setPhase("done");
    } else {
      setPhase("erasing");
    }
  }, [chapter.lines, lineIndex, phase, typed]);

  // Overlay fade-in
  useEffect(() => {
    const t1 = window.setTimeout(() => setFadedIn(true), 80);
    const t2 = window.setTimeout(() => setShowIntro(true), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Typewriter engine
  useEffect(() => {
    if (!showIntro) return;

    const line = chapter.lines[lineIndex];
    let timeout: number | undefined;

    if (phase === "typing") {
      if (typed < line.length) {
        timeout = window.setTimeout(() => setTyped((t) => t + 1), TYPE_MS);
      } else if (lineIndex === chapter.lines.length - 1) {
        timeout = window.setTimeout(() => setPhase("done"), PAUSE_AFTER_ALL);
      } else {
        timeout = window.setTimeout(() => setPhase("erasing"), PAUSE_BEFORE_ERASE);
      }
    } else if (phase === "erasing") {
      if (typed > 0) {
        timeout = window.setTimeout(() => setTyped((t) => t - 1), ERASE_MS);
      } else {
        timeout = window.setTimeout(() => {
          setLineIndex((i) => i + 1);
          setTyped(0);
          setPhase("typing");
        }, PAUSE_BEFORE_NEXT);
      }
    } else {
      timeout = window.setTimeout(() => setShowReturn(true), 600);
    }

    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [showIntro, phase, typed, lineIndex, chapter.lines]);

  // Auto-return once the finish button is visible
  useEffect(() => {
    if (!showReturn) return;
    const t = window.setTimeout(finish, AUTO_RETURN_MS);
    return () => window.clearTimeout(t);
  }, [showReturn, finish]);

  const currentLine = chapter.lines[lineIndex];
  const typedText = phase === "done" ? currentLine : currentLine.slice(0, typed);

  return (
    <div
      onClick={goNext}
      className={`fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-black px-6 transition-opacity duration-[2000ms] select-none ${
        fadedIn ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Subtle vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(20,18,10,0.0) 0%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        {/* Header — date & time on top */}
        <div
          className={`mb-12 text-center transition-all duration-[1400ms] ease-out ${
            showIntro ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="font-royal text-xs tracking-[0.55em] text-[#00ff41]/70 md:text-sm">
            {chapter.operation}
          </div>
          <h1 className="font-royal mt-5 text-center text-3xl font-semibold text-[#ece3cf] md:text-5xl">
            {chapter.title}
          </h1>
          <div className="mx-auto mt-6 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#b8a05a]/70" />
            <span className="font-royal text-xs tracking-[0.35em] text-[#b8a05a] md:text-sm">
              {chapter.dateTime}
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#b8a05a]/70" />
          </div>
        </div>

        {/* Body */}
          <div className="flex min-h-[7rem] w-full items-start justify-center md:min-h-[8rem]">
            <p className="max-w-2xl text-center font-royal-serif text-2xl italic leading-relaxed text-[#d8cbb0] md:text-4xl">
              {typedText}
              <span
                className="ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-[0.18em] bg-[#b8a05a] animate-pulse"
                aria-hidden="true"
              />
            </p>
          </div>

        {/* Footer */}
        <div className="mt-16 flex min-h-[3.5rem] flex-col items-center justify-end gap-6">
          {showReturn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="font-royal border border-[#b8a05a]/70 px-10 py-3 text-xs tracking-[0.35em] text-[#ece3cf] transition-colors duration-300 hover:bg-[#b8a05a]/10 hover:border-[#b8a05a]"
            >
              RETURN TO COMMAND CENTER
            </button>
          )}
          <div className="font-royal text-[10px] tracking-[0.4em] text-[#8b7b55]/70">
            {showReturn ? "CASE 02:17 — CLOSED" : "CLICK TO NEXT"}
          </div>
        </div>
      </div>
    </div>
  );
}