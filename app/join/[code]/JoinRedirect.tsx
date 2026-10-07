"use client";

// The QR landing. Joins, then hands over to /play — or waits for the host.
//
// People scan while the host is still setting up, so this screen cannot be a
// dead end: it keeps trying until the lobby opens, and takes them in by itself.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { StatusScreen } from "@/components/play/StatusScreen";
import { JOIN_JITTER_MS, POLL_MS } from "@/lib/constants";
import { getDeviceToken } from "@/lib/device-token";
import { isRetryablePhase, type JoinPhase } from "@/lib/join-phase";
import { onSessionEvent } from "@/lib/realtime";
import { joinSession } from "@/lib/rpc";
import { joinCodeSchema } from "@/lib/validation";

export function JoinRedirect({ joinCode }: { joinCode: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<JoinPhase>("joining");

  const attempt = useCallback(async () => {
    // Validate before spending a round trip on an obvious typo.
    if (!joinCodeSchema.safeParse(joinCode).success) {
      setPhase("bad_code");
      return;
    }

    try {
      const result = await joinSession(joinCode, getDeviceToken());

      if (result.status === "joined") {
        // replace, not push: Back should leave the game, not rejoin it.
        // The code rides along so /play can subscribe to the broadcast channel.
        router.replace(`/play/${result.session_id}?code=${joinCode}`);
        return;
      }

      setPhase(result.status);
    } catch {
      setPhase("error");
    }
  }, [joinCode, router]);

  // First go.
  useEffect(() => {
    void attempt();
  }, [attempt]);

  // Then keep trying, for as long as trying could change anything.
  useEffect(() => {
    if (!isRetryablePhase(phase)) return;

    // Fast path: the host announces the lobby and every waiting phone lets
    // itself in. Jittered because join_session is a write and the whole room
    // hears this in the same instant — see JOIN_JITTER_MS.
    const unsubscribe = onSessionEvent(joinCode, (event) => {
      if (event === "ended") {
        setPhase("ended");
        return;
      }
      setTimeout(() => void attempt(), Math.random() * JOIN_JITTER_MS);
    });

    // Safety net for a websocket that never connected or quietly dropped.
    const timer = setInterval(() => void attempt(), POLL_MS.notOpen);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [phase, joinCode, attempt]);

  switch (phase) {
    case "bad_code":
      return <StatusScreen title="That code doesn’t look right" body="Check the host’s screen and try again." />;
    case "not_open":
      return (
        <StatusScreen
          title="This game hasn’t opened yet"
          body="Hang tight — you’ll go straight in when the host opens it."
        />
      );
    case "ended":
      return <StatusScreen title="This game has ended" />;
    case "error":
      return <StatusScreen title="Couldn’t join" body="Trying again…" />;
    default:
      return <StatusScreen title="Joining…" />;
  }
}
