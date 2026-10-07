// Countdown and reveal-window math for the player (ARCHITECTURE.md §5.3, §8).
// Pure so it can be tested without a browser or a database; hooks/usePlayerScreen
// is only a ticking wrapper around this.
//
// IMPORTANT: this is presentation, not protection. Hard rule 5 says the server
// enforces hiding — get_my_state stops returning the group after window_end.
// Everything here is arranged so the client can hide EARLIER than the server,
// never later, so a tampered or frozen clock can't extend a reveal.

import { serverNow } from "./server-clock";
import type { MyState, PlayerScreen } from "./types";

export type PlayerScreenState = {
  screen: PlayerScreen;
  secondsLeft: number | null;
};

export type DeriveOptions = {
  /** From computeClockOffset: ms to add to the phone's clock. */
  offsetMs: number;
  /** Phone clock; injectable for tests. */
  nowMs?: number;
  /**
   * Server-clock ms at which this phone's reveal actually became visible.
   *
   * For an on-time phone this equals my_reveal_at. For a phone that was locked
   * at Start (PRD P7), my_reveal_at is already in the past when it wakes, and
   * the server anchors its window to revealed_at — the first time it handed
   * over the group — so the phone still gets a full reveal. The hook captures
   * that moment and passes it here; null means the reveal has not started yet.
   */
  revealAnchorMs?: number | null;
};

/** Screen to show, and the seconds the screen's own timer should display. */
export function derivePlayerScreen(
  state: MyState | null,
  { offsetMs, nowMs = Date.now(), revealAnchorMs = null }: DeriveOptions,
): PlayerScreenState {
  if (state === null) return { screen: "joining", secondsLeft: null };

  switch (state.status) {
    case "not_open":
      return { screen: "not_open", secondsLeft: null };
    case "waiting":
      return { screen: "waiting", secondsLeft: null };
    case "hidden":
      return { screen: "hidden", secondsLeft: null };
    case "ended":
      return { screen: "ended", secondsLeft: null };
    case "reveal":
      return deriveReveal(state, offsetMs, nowMs, revealAnchorMs);
  }
}

function deriveReveal(
  state: Extract<MyState, { status: "reveal" }>,
  offsetMs: number,
  nowMs: number,
  revealAnchorMs: number | null,
): PlayerScreenState {
  const now = serverNow(offsetMs, nowMs);
  const revealAt = Date.parse(state.my_reveal_at);

  // An unreadable timestamp must not strand the player on a frozen countdown.
  // Showing the group is safe: the server already decided this phone may see it.
  if (Number.isNaN(revealAt)) {
    return { screen: "revealed", secondsLeft: state.reveal_seconds };
  }

  if (now < revealAt) {
    return { screen: "countdown", secondsLeft: (revealAt - now) / 1000 };
  }

  // Never earlier than my_reveal_at, so a stale anchor can't shorten the window.
  const anchor = Math.max(revealAt, revealAnchorMs ?? revealAt);
  const hideAt = anchor + state.reveal_seconds * 1000;

  if (now >= hideAt) return { screen: "hidden", secondsLeft: null };
  return { screen: "revealed", secondsLeft: (hideAt - now) / 1000 };
}

/**
 * Whether this state is a reveal whose countdown has finished — the moment the
 * hook should stamp its anchor.
 */
export function isRevealVisible(
  state: MyState | null,
  offsetMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (state?.status !== "reveal") return false;
  const revealAt = Date.parse(state.my_reveal_at);
  if (Number.isNaN(revealAt)) return true;
  return serverNow(offsetMs, nowMs) >= revealAt;
}

// ---------------------------------------------------------------------------
// Block wipe: the reveal → hidden transition (DESIGN.md §7, the one exception
// to the 300ms motion cap). Timings are mirrored in app/globals.css.
// ---------------------------------------------------------------------------

export const WIPE_COLUMNS = 5;
/** How long one column takes to cover, and again to clear. */
export const WIPE_COLUMN_MS = 200;
/** Each column starts this much after the one to its left. */
export const WIPE_STAGGER_MS = 60;
/** From the first column moving to the last one fully covering the screen. */
export const WIPE_COVER_MS = WIPE_COLUMN_MS + (WIPE_COLUMNS - 1) * WIPE_STAGGER_MS;

/**
 * How long before the hide the cover starts.
 *
 * Why early: hard rule 5 lets the client hide the group earlier than the
 * server, never later. Starting the cover ahead of hideAt means the flag is
 * already under the columns when it is struck, instead of the animation
 * holding it on screen past its window. The extra 200ms is one tick of
 * usePlayerScreen (TICK_MS), since the tick that starts the wipe can land late.
 */
export const WIPE_LEAD_MS = WIPE_COVER_MS + 200;

/** True during the last WIPE_LEAD_MS of a reveal: the columns should be coming down. */
export function isWipeCovering({ screen, secondsLeft }: PlayerScreenState): boolean {
  return screen === "revealed" && secondsLeft !== null && secondsLeft * 1000 <= WIPE_LEAD_MS;
}
