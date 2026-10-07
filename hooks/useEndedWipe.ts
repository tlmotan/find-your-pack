"use client";

// The hidden → ended block wipe: the columns come down over "Make your sound!",
// the ended screen swaps in underneath them, and they clear away onto it.
//
// Why this isn't useBlockWipe: that one fires off the reveal countdown, and
// there is no countdown here. The host ending the game is an event that simply
// arrives, so the wipe is triggered by the screen changing instead of by time
// running out.
//
// To hide the swap, the hidden screen is held on for WIPE_COVER_MS while the
// columns close over it. That delay is the reason this hook is deliberately
// narrow: it applies to exactly one transition, and neither side of it shows a
// group, so it cannot hold a reveal open a moment longer than its window
// (hard rule 5). Every other screen change stays instant.

import { useEffect, useRef, useState } from "react";

import { WIPE_COVER_MS, isEndedWipe } from "@/lib/player-screen";
import type { PlayerScreen } from "@/lib/types";
import type { WipePhase } from "./useBlockWipe";

type Result = {
  /** The screen to render — the held one while covering, otherwise the real one. */
  screen: PlayerScreen;
  phase: WipePhase;
};

export function useEndedWipe(screen: PlayerScreen): Result {
  const [held, setHeld] = useState<PlayerScreen | null>(null);
  const [phase, setPhase] = useState<WipePhase>(null);
  const previous = useRef(screen);

  useEffect(() => {
    const from = previous.current;
    previous.current = screen;

    if (!isEndedWipe(from, screen)) return;
    // With motion off the columns never leave their resting position offscreen,
    // so holding the old screen would be a stall with nothing covering it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setHeld("hidden");
    setPhase("cover");

    // Timers rather than onAnimationEnd: a backgrounded tab may never fire the
    // event, and this must not be able to strand the player on a stale screen.
    const swap = setTimeout(() => {
      setHeld(null);
      setPhase("clear");
    }, WIPE_COVER_MS);
    const done = setTimeout(() => setPhase(null), WIPE_COVER_MS * 2);

    // If anything moves the player somewhere else mid-wipe, drop the hold and
    // show where they actually are.
    return () => {
      clearTimeout(swap);
      clearTimeout(done);
      setHeld(null);
      setPhase(null);
    };
  }, [screen]);

  return { screen: held ?? screen, phase };
}
