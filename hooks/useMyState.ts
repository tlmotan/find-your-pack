"use client";

// Player state machine driver (ARCHITECTURE.md §6.1).
// - Listens for Broadcast "started"/"ended" → waits 0–START_JITTER_MS → get_my_state
// - Polls get_my_state every POLL_MS.waiting while waiting, POLL_MS.afterReveal after
// - Refetches the moment the page comes back, the network returns, or the tab
//   is restored: a player checking Instagram mid-lobby is the normal case, not
//   an edge one.
// - Tracks the server clock offset from server_now

import { useCallback, useEffect, useRef, useState } from "react";

import { connectionView, type ConnectionView } from "@/lib/connection";
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
  connection: ConnectionView;
};

export function useMyState(sessionId: string, joinCode: string): UseMyState {
  const [state, setState] = useState<MyState | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);

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
      setFailures(0);
    } catch (e) {
      // Keep the last good state on screen. A dropped request on venue wifi is
      // normal; blanking the player's group would not be. PlayScreen decides
      // what, if anything, to say about it.
      setError(e instanceof Error ? e.message : "Could not reach the game");
      setFailures((n) => n + 1);
    }
  }, [sessionId]);

  // Poll. A timeout chain rather than setInterval, because the gap changes with
  // the state and must be able to stop entirely once the session has ended.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        await refresh();
      } finally {
        // Scheduling in `finally` so nothing — not even an unexpected throw —
        // can leave the loop dead for the rest of the session.
        if (!cancelled) {
          const next = pollIntervalMs(stateRef.current);
          if (next !== null) timer = setTimeout(() => void tick(), next);
        }
      }
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

  // Everything that means "the player is back, or the network is". A phone
  // locked at Start wakes through visibilitychange (PRD P7); someone returning
  // from another app may instead arrive via pageshow out of the bfcache; and
  // `online` catches signal coming back while the page stayed open.
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => void refresh();

    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  return { state, clockOffsetMs, error, connection: connectionView(state, failures) };
}
