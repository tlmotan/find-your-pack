"use client";

import { useMyState } from "@/hooks/useMyState";
import { usePlayerScreen } from "@/hooks/usePlayerScreen";
import { StatusScreen } from "@/components/play/StatusScreen";
import { WaitingScreen } from "@/components/play/WaitingScreen";

export function PlayScreen({ sessionId, joinCode }: { sessionId: string; joinCode: string }) {
  const { state, clockOffsetMs } = useMyState(sessionId, joinCode);
  const { screen } = usePlayerScreen(state, clockOffsetMs);

  // TODO: render Countdown / RevealScreen / HiddenScreen for the remaining states
  switch (screen) {
    case "waiting":
      return <WaitingScreen />;
    case "not_open":
      return <StatusScreen title="This game hasn't opened yet" />;
    case "ended":
      return <StatusScreen title="This game has ended" />;
    default:
      return <StatusScreen title="Loading…" />;
  }
}
