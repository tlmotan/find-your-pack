"use client";

// Turns MyState + the server clock into the screen to show:
// waiting → countdown (until my_reveal_at) → revealed (reveal_seconds) → hidden.
//
// All the math lives in lib/player-screen.ts so it can be unit-tested; this
// hook only ticks the clock and remembers one thing the pure function cannot
// know on its own — the moment this phone's reveal actually became visible.

import { useEffect, useRef, useState } from "react";

import {
  derivePlayerScreen,
  isRevealVisible,
  type PlayerScreenState,
} from "@/lib/player-screen";
import { serverNow } from "@/lib/server-clock";
import type { MyState } from "@/lib/types";

/** Fast enough that a 1 s countdown digit never looks late, cheap enough to
 *  leave running on an old phone. */
const TICK_MS = 200;

export function usePlayerScreen(state: MyState | null, clockOffsetMs: number): PlayerScreenState {
  // Keyed by my_reveal_at so a fresh reveal never inherits an old anchor.
  const anchorRef = useRef<{ key: string; at: number } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (state?.status !== "reveal") {
      anchorRef.current = null;
      return;
    }

    const key = state.my_reveal_at;
    if (anchorRef.current?.key !== key) anchorRef.current = null;

    // Stamped once, the first tick on which the countdown has finished. For a
    // phone that was locked at Start this is when it woke, which is what earns
    // it a full reveal (PRD P7).
    const stamp = () => {
      if (!anchorRef.current && isRevealVisible(state, clockOffsetMs)) {
        anchorRef.current = { key, at: serverNow(clockOffsetMs) };
      }
    };

    stamp();
    setTick((t) => t + 1);

    const id = setInterval(() => {
      stamp();
      setTick((t) => t + 1);

      // Once hidden, nothing on screen changes with time. Stop burning battery
      // in a room full of phones; the next get_my_state will move us on.
      const next = derivePlayerScreen(state, {
        offsetMs: clockOffsetMs,
        revealAnchorMs: anchorRef.current?.at ?? null,
      });
      if (next.screen === "hidden") clearInterval(id);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [state, clockOffsetMs]);

  return derivePlayerScreen(state, {
    offsetMs: clockOffsetMs,
    revealAnchorMs: anchorRef.current?.at ?? null,
  });
}
