"use client";

import { BlockWipe } from "@/components/BlockWipe";
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
  const { state, clockOffsetMs, connection } = useMyState(sessionId, joinCode);
  const { screen, secondsLeft } = usePlayerScreen(state, clockOffsetMs);

  // Only when nothing has ever loaded. With state in hand a failed poll changes
  // nothing the player can see, so the screen stays and the footer says so.
  if (connection === "lost") {
    return <StatusScreen title="Lost the connection" body="Checking again in a moment…" />;
  }

  const reconnecting = connection === "reconnecting";

  // The wipe runs on the countdown -> reveal handover and nowhere else: the
  // flag's own hoist and the hide warning already own their moments, and a
  // wipe over either would compete rather than add.
  const wipeKey = screen === "revealed" || screen === "countdown" ? screen : "other";

  const body = () => {
    switch (screen) {
      case "waiting":
        return <WaitingScreen reconnecting={reconnecting} />;

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
        return <HiddenScreen packSize={packSizeOf(state)} reconnecting={reconnecting} />;

      case "not_open":
        return <StatusScreen title="This game hasn’t opened yet" />;

      case "ended":
        return <StatusScreen title="This game has ended" />;

      default:
        return <StatusScreen title="Loading…" />;
    }
  };

  return <BlockWipe wipeKey={wipeKey}>{body()}</BlockWipe>;
}
