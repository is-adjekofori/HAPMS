"use client";

import { useEffect, useState } from "react";

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  holdMs?: number;
}

/** Cycles through `texts`, typing each one out then deleting it before
 * moving to the next — loops forever. */
export function TypewriterText({
  texts,
  className,
  typingSpeedMs = 28,
  deletingSpeedMs = 14,
  holdMs = 2800,
}: TypewriterTextProps) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");

  useEffect(() => {
    const current = texts[index % texts.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (display.length < current.length) {
        timeout = setTimeout(
          () => setDisplay(current.slice(0, display.length + 1)),
          typingSpeedMs,
        );
      } else {
        timeout = setTimeout(() => setPhase("deleting"), holdMs);
      }
    } else {
      if (display.length > 0) {
        timeout = setTimeout(
          () => setDisplay(current.slice(0, display.length - 1)),
          deletingSpeedMs,
        );
      } else {
        timeout = setTimeout(() => {
          setIndex((i) => (i + 1) % texts.length);
          setPhase("typing");
        }, typingSpeedMs);
      }
    }

    return () => clearTimeout(timeout);
  }, [display, phase, index, texts, typingSpeedMs, deletingSpeedMs, holdMs]);

  return (
    <span className={className}>
      {display}
      <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-middle" />
    </span>
  );
}
