"use client";

// Polls get_host_state every POLL_MS.host (ARCHITECTURE.md §6.1).

import type { HostState } from "@/lib/types";

export type UseHostState = {
  state: HostState | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useHostState(sessionId: string, hostSecret: string | null): UseHostState {
  // TODO: implement
  void sessionId; void hostSecret;
  return { state: null, error: null, refresh: async () => {} };
}
