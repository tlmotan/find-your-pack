"use client";

// Player state machine driver (ARCHITECTURE.md §6.1).
// - Listens for Broadcast "started"/"ended" → waits 0–START_JITTER_MS → get_my_state
// - Polls get_my_state every POLL_MS.waiting while waiting, POLL_MS.afterReveal after
// - Calls get_my_state immediately on visibilitychange (phone unlocked)
// - Tracks the server clock offset from server_now

import { useCallback, useEffect, useRef, useState } from "react";

import { START_JITTER_MS } from "@/lib/constants";
import { getDeviceToken } from "@/lib/device-token";
import { pollIntervalMs } from "@/lib/poll";
import { onSessionEvent } from "@/lib/realtime";
import { getMyState } from "@/lib/rpc";
import { computeClockOffset } from "@/lib/server-clock";
import type { MyState } from "@/lib/types";

export type UseMyState = {
  state: MyState | null;
  clockOffsetMs: number;
  error: string | null;
};

export function useMyState(sessionId: string, joinCode: string): UseMyState {
  const [state, setState] = useState<MyState | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // The poll loop needs the newest state to pick its next delay, but must not
  // restart every time that state changes — a ref keeps the loop stable.
  const stateRef = useRef<MyState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getMyState(sessionId, getDeviceToken());
      stateRef.current = next;
      setState(next);

      // Only waiting and reveal carry server_now; every one of them re-anchors
      // the offset, so a phone whose clock drifts mid-game keeps up.
      if ("server_now" in next && typeof next.server_now === "string") {
        setClockOffsetMs(computeClockOffset(next.server_now));
      }
      setError(null);
    } catch (e) {
      // Keep the last good state on screen. A dropped request on venue wifi is
      // normal; blanking the player's group would not be.
      setError(e instanceof Error ? e.message : "Could not reach the game");
    }
  }, [sessionId]);

  // Poll. A timeout chain rather than setInterval, because the gap changes with
  // the state and must be able to stop entirely once the session has ended.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await refresh();
      if (cancelled) return;
      const next = pollIntervalMs(stateRef.current);
      if (next !== null) timer = setTimeout(() => void tick(), next);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  // Broadcast is the fast path; polling above is only the safety net.
  useEffect(() => {
    if (!joinCode) return;

    return onSessionEvent(joinCode, () => {
      // Jitter: without it, 150 phones call get_my_state in the same
      // millisecond and the one moment the game depends on is the one we
      // chose to stampede.
      const delay = Math.random() * START_JITTER_MS;
      setTimeout(() => void refresh(), delay);
    });
  }, [joinCode, refresh]);

  // A phone locked at Start wakes with stale state and possibly a missed
  // broadcast; this is what gets it its reveal (PRD P7).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { state, clockOffsetMs, error };
}
