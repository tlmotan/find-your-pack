"use client";

// Player state machine driver (ARCHITECTURE.md §6.1).
// - Listens for Broadcast "started"/"ended" → waits 0–START_JITTER_MS → get_my_state
// - Polls get_my_state every POLL_MS.waiting while waiting, POLL_MS.afterReveal after
// - Refetches the moment the page comes back, the network returns, or the tab
//   is restored: a player checking Instagram mid-lobby is the normal case, not
//   an edge one.
// - Tracks the server clock offset from server_now
// - Recovers from "not_joined" (the server has no participant row for this
//   phone) by re-joining once and re-checking a few times before showing the
//   player anything about it (NOT_JOINED_RECHECKS).

import { useCallback, useEffect, useRef, useState } from "react";

import { connectionView, type ConnectionView } from "@/lib/connection";
import { NOT_JOINED_RECHECKS, START_JITTER_MS } from "@/lib/constants";
import { getDeviceToken } from "@/lib/device-token";
import { pollIntervalMs } from "@/lib/poll";
import { onSessionEvent } from "@/lib/realtime";
import { getMyState, joinSession } from "@/lib/rpc";
import { computeClockOffset } from "@/lib/server-clock";
import type { MyState } from "@/lib/types";

export type UseMyState = {
  state: MyState | null;
  clockOffsetMs: number;
  error: string | null;
  connection: ConnectionView;
};

/**
 * The fix for "not_joined": re-join, then ask again.
 *
 * A phone with no participant row reads as "not_joined" forever, and polling
 * cannot change that — only join_session can make the row. It still refuses
 * while the lobby is shut, so this cannot sneak anyone in early.
 *
 * Returns null for "that didn't help", leaving the state as it was. A failure
 * here must never surface as a connection error: the player would be told their
 * network is broken when the real problem is a lost spot.
 */
async function rejoinThenFetch(sessionId: string, joinCode: string): Promise<MyState | null> {
  try {
    const joined = await joinSession(joinCode, getDeviceToken());
    // A different id would mean this code now belongs to another game; codes are
    // unique per session, so that should be impossible. Bail rather than show
    // someone another game's state.
    if (joined.status !== "joined" || joined.session_id !== sessionId) return null;

    return await getMyState(sessionId, getDeviceToken());
  } catch {
    return null;
  }
}

export function useMyState(sessionId: string, joinCode: string): UseMyState {
  const [state, setState] = useState<MyState | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);

  // The poll loop needs the newest state to pick its next delay, but must not
  // restart every time that state changes — a ref keeps the loop stable.
  const stateRef = useRef<MyState | null>(null);

  // How many "not_joined" answers in a row, which is what decides whether the
  // poll loop asks again (pollIntervalMs), and a latch so the re-join is
  // attempted once per streak rather than on every poll.
  const notJoinedStreak = useRef(0);
  const triedRejoin = useRef(false);

  const refresh = useCallback(async () => {
    try {
      let next = await getMyState(sessionId, getDeviceToken());

      if (next.status === "not_joined") {
        notJoinedStreak.current += 1;

        // Without the code from the QR link there is nothing to re-join with,
        // so the answer has to stand.
        if (joinCode !== "" && !triedRejoin.current) {
          triedRejoin.current = true;
          next = (await rejoinThenFetch(sessionId, joinCode)) ?? next;
        }
      }

      if (next.status !== "not_joined") {
        notJoinedStreak.current = 0;
        triedRejoin.current = false;
      }

      // The ref drives the poll cadence, so it always holds the truth. What the
      // player SEES lags it on purpose while we are still trying: telling
      // someone to scan the QR code again, only to pull them back into the game
      // a moment later, is worse than a couple of seconds of the old screen.
      stateRef.current = next;

      const stillTrying =
        next.status === "not_joined" && notJoinedStreak.current < NOT_JOINED_RECHECKS;

      if (!stillTrying) setState(next);

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
  }, [sessionId, joinCode]);

  // Poll. A timeout chain rather than setInterval, because the gap changes with
  // the state and must be able to stop entirely once there is nothing left to
  // learn (the session ended, or the spot is gone for good).
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
          const next = pollIntervalMs(stateRef.current, notJoinedStreak.current);
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
