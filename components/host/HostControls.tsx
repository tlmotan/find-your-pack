"use client";

// Open lobby / Start / End buttons, enabled by status (PRD H1b, H5, H7).
// Start is disabled below MIN_PLAYERS_TO_START active players.

import { useState } from "react";

import { MIN_PLAYERS_TO_START } from "@/lib/constants";
import type { HostState } from "@/lib/types";

type Props = {
  state: HostState;
  busy?: boolean;
  onOpenLobby: () => void;
  onStart: () => void;
  onEnd: () => void;
};

const primary =
  "rounded-pill h-14 w-full bg-accent text-lg font-semibold text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98] disabled:bg-hairline disabled:text-body disabled:active:scale-100";

export function HostControls({ state, busy = false, onOpenLobby, onStart, onEnd }: Props) {
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const enoughPlayers = state.active_count >= MIN_PLAYERS_TO_START;

  return (
    <div className="w-full">
      {state.status === "scheduled" ? (
        <>
          <button type="button" className={primary} disabled={busy} onClick={onOpenLobby}>
            {busy ? "Opening…" : "Open lobby"}
          </button>
          <p className="mt-3 text-center text-[15px] text-muted">
            Nobody can join until you do. Scanning early shows &ldquo;not open yet&rdquo;.
          </p>
        </>
      ) : null}

      {state.status === "lobby" ? (
        <>
          <button
            type="button"
            className={primary}
            // Disabled rather than failing at the server: the host is standing
            // in front of a room and should see why before they press it.
            disabled={busy || !enoughPlayers}
            onClick={onStart}
          >
            {busy ? "Starting…" : "Start the game"}
          </button>
          <p className="mt-3 text-center text-[15px] text-muted">
            {enoughPlayers
              ? "Everyone reveals at the same moment."
              : `Waiting for ${MIN_PLAYERS_TO_START} players to join.`}
          </p>
        </>
      ) : null}

      {/* End is destructive and unrecoverable, so it never sits one tap away. */}
      <div className="mt-8 text-center">
        {confirmingEnd ? (
          <div role="group" aria-label="Confirm ending the game">
            <p className="text-[15px] text-body">
              End the game and delete it? Players lose their groups.
            </p>
            <div className="mt-3 flex justify-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onEnd}
                className="rounded-pill h-12 px-6 text-base font-semibold text-danger transition-colors hover:underline"
              >
                Yes, end it
              </button>
              <button
                type="button"
                onClick={() => setConfirmingEnd(false)}
                className="rounded-pill h-12 border-[1.5px] border-hairline px-6 text-base font-semibold text-ink"
              >
                Keep playing
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingEnd(true)}
            className="rounded-sm text-[15px] font-semibold text-muted transition-colors hover:text-danger"
          >
            End game
          </button>
        )}
      </div>
    </div>
  );
}
