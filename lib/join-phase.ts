// What the join screen is showing, and whether it is worth trying again.
//
// Pure so the rule is testable without React, matching connection.ts and
// poll.ts.

export type JoinPhase =
  /** First attempt in flight. */
  | "joining"
  /** The code does not match the alphabet. Nothing will change this. */
  | "bad_code"
  /** The host has not opened the lobby yet. This changes the moment they do. */
  | "not_open"
  /** The session is gone. Nothing will bring it back. */
  | "ended"
  /** The request failed. Venue wifi; worth another go. */
  | "error";

/**
 * Whether a phone sitting on this screen should keep trying.
 *
 * The regression this exists to prevent: someone who scans the QR before the
 * host is ready must never be stranded on a dead screen waiting for the idea of
 * refreshing to occur to them.
 */
export function isRetryablePhase(phase: JoinPhase): boolean {
  return phase === "not_open" || phase === "error";
}
