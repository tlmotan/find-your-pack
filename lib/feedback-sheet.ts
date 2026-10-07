// Entrance timing for the post-game feedback sheet (DESIGN.md §7).
//
// Pure so the sequence can be tested without a browser; hooks/useSheetEntrance
// is only a timer wrapper around this. Durations are mirrored in the
// .sheet-rise / .sheet-dim rules in app/globals.css — change both together,
// the same arrangement the WIPE_* constants already use.
//
// This is a post-game transition, not a modal. Nothing here gates access to a
// group, so unlike the reveal math it does no security work: if a timer is
// late the player simply sees the sheet arrive late.

/** The ended screen is left alone this long before the sheet starts moving. */
export const SHEET_DELAY_MS = 200;
/** How long the sheet takes to travel from below the viewport to its rest. */
export const SHEET_RISE_MS = 600;
/** Ended screen opacity once the sheet has settled over it. */
export const SHEET_DIM_OPACITY = 0.45;

/**
 * below   — fully off the bottom edge, ended screen at full brightness
 * rising  — travelling up while the background dims, not yet interactive
 * settled — at rest, controls live
 */
export type SheetPhase = "below" | "rising" | "settled";

/** The phase this many ms after the ended screen became visible. */
export function sheetPhaseAt(elapsedMs: number, reducedMotion = false): SheetPhase {
  // With motion off there is no travel to show, so the sheet is simply already
  // there — a 200ms delay followed by a jump would read as a pop-in, which is
  // the one thing the brief rules out.
  if (reducedMotion) return "settled";
  if (elapsedMs < SHEET_DELAY_MS) return "below";
  if (elapsedMs < SHEET_DELAY_MS + SHEET_RISE_MS) return "rising";
  return "settled";
}

/**
 * Whether the controls should accept input.
 *
 * Only at rest. A chip that moves under the thumb mid-press is how someone
 * taps the wrong rating, so the sheet is inert until it stops.
 */
export function isSheetInteractive(phase: SheetPhase): boolean {
  return phase === "settled";
}
