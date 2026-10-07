// What, if anything, to tell a player about the connection.
//
// Pure so the rule is testable without timers or a network, matching poll.ts
// and player-screen.ts.

import { OFFLINE_AFTER_FAILURES } from "./constants";
import type { MyState } from "./types";

export type ConnectionView =
  /** Showing real state, or failing so briefly it is not worth saying. */
  | "ok"
  /** Still showing real state, but it is going stale. Say so quietly. */
  | "reconnecting"
  /** Nothing has ever loaded. There is no screen to protect. */
  | "lost";

export function connectionView(
  state: MyState | null,
  consecutiveFailures: number,
): ConnectionView {
  // With state in hand, a failed poll changes nothing the player can see: their
  // group is already on screen. Replacing it with an error would be the bug.
  if (state !== null) {
    return consecutiveFailures >= OFFLINE_AFTER_FAILURES ? "reconnecting" : "ok";
  }

  // No state and no failures means the first request is simply still in flight.
  return consecutiveFailures > 0 ? "lost" : "ok";
}
