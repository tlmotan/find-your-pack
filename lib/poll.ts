// How often a phone should ask get_my_state (ARCHITECTURE.md §6.1).
// Pure, so the cadence is testable without timers.

import { POLL_MS } from "./constants";
import type { MyState } from "./types";

/** Milliseconds until the next poll, or null to stop polling for good. */
export function pollIntervalMs(state: MyState | null): number | null {
  // No state yet (first load, or the last request failed): poll at the
  // attentive rate, because the thing we are waiting for is Start.
  if (state === null) return POLL_MS.waiting;

  switch (state.status) {
    case "not_open":
    case "waiting":
      // Start can land at any moment, and this is the fallback for a broadcast
      // that never arrived.
      return POLL_MS.waiting;

    case "reveal":
    case "hidden":
      // Only pack size changes now, as late players are assigned. Backing off
      // matters: 150 phones polling hard would be the app's heaviest moment.
      return POLL_MS.afterReveal;

    case "ended":
      // Nothing will ever change again. Stop, rather than hammer a dead session.
      return null;
  }
}
