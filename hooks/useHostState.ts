"use client";

// Polls get_host_state every POLL_MS.host (ARCHITECTURE.md §6.1).

import { useCallback, useEffect, useState } from "react";

import { POLL_MS } from "@/lib/constants";
import { getHostState } from "@/lib/rpc";
import type { HostState } from "@/lib/types";

export type UseHostState = {
  state: HostState | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useHostState(sessionId: string, hostSecret: string | null): UseHostState {
  const [state, setState] = useState<HostState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hostSecret) return;
    try {
      setState(await getHostState(sessionId, hostSecret));
      setError(null);
    } catch (e) {
      // Keep the last good state: the host is reading a live count off a
      // projector, and blanking it because one poll failed is worse than a
      // number three seconds stale.
      setError(e instanceof Error ? e.message : "Could not reach the game");
    }
  }, [sessionId, hostSecret]);

  useEffect(() => {
    if (!hostSecret) return;

    let cancelled = false;
    void refresh();

    const id = setInterval(() => {
      if (!cancelled) void refresh();
    }, POLL_MS.host);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hostSecret, refresh]);

  return { state, error, refresh };
}
