"use client";

// Player state machine driver (ARCHITECTURE.md §6.1).
// - Listens for Broadcast "started"/"ended" → waits 0–START_JITTER_MS → get_my_state
// - Polls get_my_state every POLL_MS.waiting while waiting, POLL_MS.afterReveal after
// - Calls get_my_state immediately on visibilitychange (phone unlocked)
// - Tracks the server clock offset from server_now

import type { MyState } from "@/lib/types";

export type UseMyState = {
  state: MyState | null;
  clockOffsetMs: number;
  error: string | null;
};

export function useMyState(sessionId: string, joinCode: string): UseMyState {
  // TODO: implement
  void sessionId; void joinCode;
  return { state: null, clockOffsetMs: 0, error: null };
}
