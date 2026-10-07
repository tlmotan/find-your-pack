"use client";

import { useRef } from "react";

import { BlockWipe } from "@/components/play/BlockWipe";
import { Countdown } from "@/components/play/Countdown";
import { HiddenScreen } from "@/components/play/HiddenScreen";
import { RevealScreen } from "@/components/play/RevealScreen";
import { StatusScreen } from "@/components/play/StatusScreen";
import { WaitingScreen } from "@/components/play/WaitingScreen";
import { useBlockWipe } from "@/hooks/useBlockWipe";
import { useEndedWipe } from "@/hooks/useEndedWipe";
import { useMyState } from "@/hooks/useMyState";
import { usePlayerScreen } from "@/hooks/usePlayerScreen";
import type { ConnectionView } from "@/lib/connection";
import type { PlayerScreenState } from "@/lib/player-screen";
import type { MyState } from "@/lib/types";

/** Pack size survives the switch from reveal to hidden, so the count does not
 *  blink while the next get_my_state is in flight. */
function packSizeOf(state: MyState | null): number {
  if (state?.status === "hidden" || state?.status === "reveal") return state.pack_size;
  return 0;
}

/**
 * The last size we were told, kept for the hidden → ended wipe.
 *
 * The state has already flipped to "ended" (which carries no pack size) while
 * the hidden screen is still being held under the columns, so without this the
 * footer would blink to "0 in your pack" just as the wipe starts closing.
 */
function useLastPackSize(state: MyState | null): number {
  const size = packSizeOf(state);
  const last = useRef(size);
  if (size > 0) last.current = size;
  return size > 0 ? size : last.current;
}

export function PlayScreen({ sessionId, joinCode }: { sessionId: string; joinCode: string }) {
  const { state, clockOffsetMs, connection } = useMyState(sessionId, joinCode);
  const view = usePlayerScreen(state, clockOffsetMs);
  const wipe = useBlockWipe(view);
  const ended = useEndedWipe(view.screen);
  const packSize = useLastPackSize(state);

  // Only one wipe can be running: the reveal countdown drives the first, the
  // host ending the game drives the second, and they cannot overlap.
  return (
    <>
      <PlayerScreenBody
        state={state}
        view={{ ...view, screen: ended.screen }}
        packSize={packSize}
        connection={connection}
      />
      <BlockWipe phase={wipe ?? ended.phase} />
    </>
  );
}

function PlayerScreenBody({
  state,
  view: { screen, secondsLeft },
  packSize,
  connection,
}: {
  state: MyState | null;
  view: PlayerScreenState;
  packSize: number;
  connection: ConnectionView;
}) {

  // Only when nothing has ever loaded. With state in hand a failed poll changes
  // nothing the player can see, so the screen stays and the footer says so.
  if (connection === "lost") {
    return <StatusScreen title="Lost the connection" body="Checking again in a moment…" />;
  }

  const reconnecting = connection === "reconnecting";

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
      return <HiddenScreen packSize={packSize} reconnecting={reconnecting} />;

    case "not_open":
      return <StatusScreen title="This game hasn’t opened yet" />;

    case "ended":
      return <StatusScreen title="This game has ended" />;

    default:
      return <StatusScreen title="Loading…" />;
  }
}
