"use client";

// Drives the reveal → hidden block wipe. The columns come down in the last
// moments of the reveal (isWipeCovering), the screen swaps to hidden
// underneath them, then they clear away.
//
// Cosmetic only: when the group disappears is still decided by
// usePlayerScreen, never by this animation.

import { useEffect, useRef, useState } from "react";

import { WIPE_COVER_MS, isWipeCovering, type PlayerScreenState } from "@/lib/player-screen";

export type WipePhase = "cover" | "clear" | null;

export function useBlockWipe(view: PlayerScreenState): WipePhase {
  const covering = isWipeCovering(view);
  const wasCovering = useRef(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (covering) {
      wasCovering.current = true;
      return;
    }
    if (!wasCovering.current) return;
    wasCovering.current = false;

    // Only clear onto the hidden screen. Anything else (the game ended, the
    // connection dropped) just swaps without the second half.
    if (view.screen !== "hidden") return;
    setClearing(true);
    // A timer, not onAnimationEnd: with reduced motion there is no animation
    // to end, and a backgrounded tab may never fire the event.
    const id = setTimeout(() => setClearing(false), WIPE_COVER_MS);
    return () => clearTimeout(id);
  }, [covering, view.screen]);

  if (covering) return "cover";
  if (clearing && view.screen === "hidden") return "clear";
  return null;
}
