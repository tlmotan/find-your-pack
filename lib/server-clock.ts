// Never trust the phone's clock for game timing (ARCHITECTURE.md §5.3).
// offset = server_now - local_now, measured on each get_my_state response.

/** Offset in ms to add to Date.now() to get server time. */
export function computeClockOffset(serverNowIso: string, localNowMs: number = Date.now()): number {
  const serverMs = Date.parse(serverNowIso);

  // A malformed timestamp would poison every countdown with NaN, which reads as
  // a frozen screen. Falling back to the phone's own clock is wrong by at most
  // the skew we were trying to correct, and the server still enforces hiding.
  if (Number.isNaN(serverMs)) return 0;

  // Not corrected for round-trip latency: the response is at most a few hundred
  // ms old, the countdown is 3 s, and every phone is biased the same direction,
  // so they still reveal together — which is the property that matters.
  return serverMs - localNowMs;
}

/** Current time on the server's clock. */
export function serverNow(offsetMs: number, localNowMs: number = Date.now()): number {
  return localNowMs + offsetMs;
}

/** Ms remaining until a server timestamp (negative if already passed). */
export function msUntil(targetIso: string, offsetMs: number, localNowMs: number = Date.now()): number {
  return Date.parse(targetIso) - serverNow(offsetMs, localNowMs);
}
