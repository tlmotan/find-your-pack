"use client";

// A block wipe between two screens: five columns drop in, the content is
// swapped behind them, then they drop out.
//
// Cosmetic only. It overlays whatever is beneath and changes no timing — the
// server still decides when a reveal starts and when it ends. What it costs is
// visible time, not game time: on a short reveal window part of the flag sits
// behind the columns.

import { useEffect, useRef, useState, type ReactNode } from "react";

const COLUMNS = 5;

type Phase = "idle" | "cover" | "clear";

type Props = {
  /** Change this to run a wipe. The children are swapped while covered. */
  wipeKey: string;
  children: ReactNode;
};

export function BlockWipe({ wipeKey, children }: Props) {
  // What is actually on screen, which lags `children` for the length of the
  // cover phase so the swap happens where nobody can see it.
  const [shown, setShown] = useState<ReactNode>(children);
  const [phase, setPhase] = useState<Phase>("idle");
  const shownKey = useRef(wipeKey);

  // Keep the held children current whenever we are not mid-wipe, so an
  // unrelated re-render (a ticking countdown, a pack size arriving) still
  // reaches the screen.
  useEffect(() => {
    if (phase === "idle" && shownKey.current === wipeKey) setShown(children);
  }, [children, phase, wipeKey]);

  useEffect(() => {
    if (wipeKey === shownKey.current) return;
    setPhase("cover");
  }, [wipeKey]);

  // Only the last column's end matters: it finishes last, so the screen is
  // fully covered exactly then.
  const onLastColumnEnd = () => {
    if (phase === "cover") {
      shownKey.current = wipeKey;
      setShown(children);
      setPhase("clear");
      return;
    }
    if (phase === "clear") setPhase("idle");
  };

  return (
    <>
      {shown}

      {phase === "idle" ? null : (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-50 flex h-[100dvh] ${
            phase === "cover" ? "block-wipe-cover" : "block-wipe-clear"
          }`}
        >
          {Array.from({ length: COLUMNS }, (_, i) => (
            <div
              key={i}
              style={{ "--i": i } as React.CSSProperties}
              onAnimationEnd={i === COLUMNS - 1 ? onLastColumnEnd : undefined}
              // Hairline between columns so five blocks stay legible when the
              // ground they cover is the same colour they are.
              className="block-wipe-col h-full w-1/5 border-r border-rule bg-ground last:border-r-0"
            />
          ))}
        </div>
      )}
    </>
  );
}
