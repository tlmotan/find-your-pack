"use client";

// Drives the feedback sheet's arrival: a short pause on the ended screen, then
// the sheet travels up while the screen behind it dims.
//
// Why a hook and not a CSS animation on mount: the sheet must not start moving
// while the block wipe's columns are still clearing over the ended screen
// (useEndedWipe), or the whole travel happens behind them and the player sees
// only a sheet that is suddenly there. `ready` is how the caller says the
// ended screen is actually on show.
//
// The phase decision itself lives in lib/feedback-sheet.ts so it can be tested
// without a DOM; this file is only the timers.

import { useCallback, useEffect, useState } from "react";

import {
  SHEET_DELAY_MS,
  SHEET_RISE_MS,
  type SheetPhase,
  sheetPhaseAt,
} from "@/lib/feedback-sheet";

type Result = {
  phase: SheetPhase;
  /** False once the sheet has been sent away and finished travelling back down. */
  present: boolean;
  /** Slide the sheet back out, then unmount it. */
  dismiss: () => void;
};

export function useSheetEntrance(ready: boolean): Result {
  const [phase, setPhase] = useState<SheetPhase>("below");
  const [present, setPresent] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!ready || leaving) return;

    // Read the preference at the moment the sequence starts rather than on
    // mount: the CSS kill-switch in globals.css already strips the transition,
    // so without this the sheet would sit offscreen for the delay and then jump.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPhase(sheetPhaseAt(0, true));
      return;
    }

    // Timers, not transitionend: a backgrounded tab may never fire the event,
    // and that would leave the sheet permanently inert.
    const rise = setTimeout(() => setPhase(sheetPhaseAt(SHEET_DELAY_MS)), SHEET_DELAY_MS);
    const settle = setTimeout(
      () => setPhase(sheetPhaseAt(SHEET_DELAY_MS + SHEET_RISE_MS)),
      SHEET_DELAY_MS + SHEET_RISE_MS,
    );

    return () => {
      clearTimeout(rise);
      clearTimeout(settle);
    };
  }, [ready, leaving]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    // "below" is both the starting and the leaving position, so the same
    // transition carries it back down; then it goes for good.
    setPhase("below");
    setTimeout(() => setPresent(false), SHEET_RISE_MS);
  }, []);

  return { phase, present, dismiss };
}
