// How often a phone should ask get_my_state (ARCHITECTURE.md §6.1).
// Pure, so the cadence is testable without timers.

import { NOT_JOINED_RECHECKS, POLL_MS } from "./constants";
import type { MyState } from "./types";

/**
 * Milliseconds until the next poll, or null to stop polling for good.
 *
 * `notJoinedStreak` is how many "not_joined" answers have arrived back to back,
 * which is the only thing that decides whether another one is worth asking for.
 */
export function pollIntervalMs(state: MyState | null, notJoinedStreak = 0): number | null {
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

    case "not_joined":
      // Recoverable, and useMyState is re-joining while we wait. Once the
      // attempts are spent the player has been asked to scan again, and there is
      // nothing left for a poll to discover.
      return notJoinedStreak < NOT_JOINED_RECHECKS ? POLL_MS.notJoined : null;

    case "ended":
      // Nothing will ever change again. Stop, rather than hammer a dead session.
      return null;
  }
}
