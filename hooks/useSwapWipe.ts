"use client";

// The block wipes that are triggered by the screen changing rather than by a
// countdown running out. Two of them:
//
//   hidden → ended      the host ended the game
//   hidden → countdown  the host started another round
//
// Both close the columns over "Make your sound!", swap underneath, and clear
// away onto the new screen.
//
// Why this isn't useBlockWipe: that one fires off the reveal countdown. These
// are events that simply arrive, so they are triggered by the screen changing
// instead of by time running out.
//
// To hide the swap, the old screen is held on for WIPE_COVER_MS while the
// columns close over it. That delay is the reason the pairs are deliberately
// narrow: neither side of either one shows a group, so a hold cannot keep a
// reveal open a moment longer than its window (hard rule 5). Every other screen
// change stays instant — in particular hidden → revealed, for a phone that woke
// up mid-reveal and has little of its window left to spend.

import { useEffect, useRef, useState } from "react";

import { WIPE_COVER_MS, isHeldWipe } from "@/lib/player-screen";
import type { PlayerScreen } from "@/lib/types";
import type { WipePhase } from "./useBlockWipe";

type Result = {
  /** The screen to render — the held one while covering, otherwise the real one. */
  screen: PlayerScreen;
  phase: WipePhase;
};

export function useSwapWipe(screen: PlayerScreen): Result {
  const [held, setHeld] = useState<PlayerScreen | null>(null);
  const [phase, setPhase] = useState<WipePhase>(null);
  const previous = useRef(screen);

  useEffect(() => {
    const from = previous.current;
    previous.current = screen;

    if (!isHeldWipe(from, screen)) return;
    // With motion off the columns never leave their resting position offscreen,
    // so holding the old screen would be a stall with nothing covering it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setHeld(from);
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
