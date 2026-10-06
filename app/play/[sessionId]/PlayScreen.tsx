"use client";

import { Countdown } from "@/components/play/Countdown";
import { HiddenScreen } from "@/components/play/HiddenScreen";
import { RevealScreen } from "@/components/play/RevealScreen";
import { StatusScreen } from "@/components/play/StatusScreen";
import { WaitingScreen } from "@/components/play/WaitingScreen";
import { useMyState } from "@/hooks/useMyState";
import { usePlayerScreen } from "@/hooks/usePlayerScreen";
import type { MyState } from "@/lib/types";

/** Pack size survives the switch from reveal to hidden, so the count does not
 *  blink while the next get_my_state is in flight. */
function packSizeOf(state: MyState | null): number {
  if (state?.status === "hidden" || state?.status === "reveal") return state.pack_size;
  return 0;
}

export function PlayScreen({ sessionId, joinCode }: { sessionId: string; joinCode: string }) {
  const { state, clockOffsetMs, error } = useMyState(sessionId, joinCode);
  const { screen, secondsLeft } = usePlayerScreen(state, clockOffsetMs);

  if (error) {
    return <StatusScreen title="Lost the connection" body="Checking again in a moment…" />;
  }

  switch (screen) {
    case "waiting":
      return <WaitingScreen />;

    case "countdown":
      return <Countdown secondsLeft={secondsLeft ?? 0} />;

    case "revealed":
      // Only a reveal state carries the group. Anything else here is a race
      // between the tick and a refetch; hold the countdown rather than flash
      // a blank screen.
      if (state?.status !== "reveal") return <Countdown secondsLeft={0} />;
      return (
        <RevealScreen
          name={state.group.name}
          emoji={state.group.emoji}
          soundHint={state.group.sound_hint}
          packSize={state.pack_size}
          secondsLeft={secondsLeft ?? 0}
        />
      );

    case "hidden":
      return <HiddenScreen packSize={packSizeOf(state)} />;

    case "not_open":
      return <StatusScreen title="This game hasn’t opened yet" />;

    case "ended":
      return <StatusScreen title="This game has ended" />;

    default:
      return <StatusScreen title="Loading…" />;
  }
}
