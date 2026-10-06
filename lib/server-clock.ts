// Never trust the phone's clock for game timing (ARCHITECTURE.md §5.3).
// offset = server_now - local_now, measured on each get_my_state response.

/** Offset in ms to add to Date.now() to get server time. */
export function computeClockOffset(serverNowIso: string, localNowMs: number = Date.now()): number {
  // TODO: implement + tests (consider halving round-trip latency later if needed)
  void serverNowIso; void localNowMs;
  throw new Error("not implemented: computeClockOffset");
}

/** Current time on the server's clock. */
export function serverNow(offsetMs: number, localNowMs: number = Date.now()): number {
  return localNowMs + offsetMs;
}

/** Ms remaining until a server timestamp (negative if already passed). */
export function msUntil(targetIso: string, offsetMs: number, localNowMs: number = Date.now()): number {
  return Date.parse(targetIso) - serverNow(offsetMs, localNowMs);
}
