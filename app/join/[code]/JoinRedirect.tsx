"use client";

// The QR landing. Joins, then hands over to /play — or explains why it can't.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusScreen } from "@/components/play/StatusScreen";
import { getDeviceToken } from "@/lib/device-token";
import { joinSession } from "@/lib/rpc";
import { joinCodeSchema } from "@/lib/validation";

type Phase = "joining" | "bad_code" | "not_open" | "ended" | "error";

export function JoinRedirect({ joinCode }: { joinCode: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("joining");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Validate before spending a round trip on an obvious typo.
      if (!joinCodeSchema.safeParse(joinCode).success) {
        setPhase("bad_code");
        return;
      }

      try {
        const result = await joinSession(joinCode, getDeviceToken());
        if (cancelled) return;

        if (result.status === "joined") {
          // replace, not push: Back should leave the game, not rejoin it.
          // The code rides along so /play can subscribe to the broadcast channel.
          router.replace(`/play/${result.session_id}?code=${joinCode}`);
          return;
        }

        setPhase(result.status);
      } catch {
        if (!cancelled) setPhase("error");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [joinCode, router]);

  switch (phase) {
    case "bad_code":
      return <StatusScreen title="That code doesn’t look right" body="Check the host’s screen and try again." />;
    case "not_open":
      return <StatusScreen title="This game hasn’t opened yet" body="Hang on for the host, then scan again." />;
    case "ended":
      return <StatusScreen title="This game has ended" />;
    case "error":
      return <StatusScreen title="Couldn’t join" body="Check your connection and try again." />;
    default:
      return <StatusScreen title="Joining…" />;
  }
}
