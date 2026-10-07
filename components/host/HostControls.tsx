"use client";

// Open lobby / Start / End buttons, enabled by status (PRD H1b, H5, H7).
// Start is disabled below MIN_PLAYERS_TO_START active players.

import { useEffect, useRef, useState } from "react";

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
  "rounded-pill h-14 w-full bg-accent text-lg font-extrabold tracking-[-0.01em] text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98] disabled:bg-ground-raised disabled:text-chalk-dim disabled:active:scale-100";

export function HostControls({ state, busy = false, onOpenLobby, onStart, onEnd }: Props) {
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const enoughPlayers = state.active_count >= MIN_PLAYERS_TO_START;

  // Only when the question opens — keyed on confirmingEnd rather than a ref
  // callback, which would re-fire and steal focus back on every re-render
  // (including the one where the button flips to "Ending…").
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirmingEnd) confirmRef.current?.focus();
  }, [confirmingEnd]);

  return (
    <div className="w-full">
      {state.status === "scheduled" ? (
        <>
          <button type="button" className={primary} disabled={busy} onClick={onOpenLobby}>
            {busy ? "Opening…" : "Open lobby"}
          </button>
          <p className="mt-4 text-center text-[15px] text-chalk-dim">
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
          <p className="mt-4 text-center text-[15px] text-chalk-dim">
            {enoughPlayers
              ? "Everyone reveals at the same moment."
              : `Waiting for ${MIN_PLAYERS_TO_START} players to join.`}
          </p>
        </>
      ) : null}

      {/* End is destructive and unrecoverable, so it never sits one tap away. */}
      {/* Left-aligned with the count and its label above it, not centred under
          a button that isn't there once the game is running. */}
      <div className="mt-8 text-center">
        {confirmingEnd ? (
          // Focus moves here on open, so a keyboard or screen-reader host lands
          // on the question rather than being left behind on a button that has
          // just been replaced.
          <div role="group" aria-label="Confirm ending the game" tabIndex={-1} ref={confirmRef}>
            <p className="text-lg font-semibold text-balance text-chalk">
              Really end the game?
            </p>
            <p className="mx-auto mt-2 max-w-[20rem] text-[15px] text-pretty text-chalk-dim">
              Everything is deleted and every player loses their pack. This
              can&rsquo;t be undone.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {/* The destructive choice is the filled one only here, two taps
                  in, where the question is already on screen. */}
              <button
                type="button"
                disabled={busy}
                onClick={onEnd}
                className="rounded-pill h-14 w-full bg-danger px-8 text-lg font-extrabold text-on-accent transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-wait disabled:active:scale-100 sm:w-auto"
              >
                {busy ? "Ending…" : "Yes, end it"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingEnd(false)}
                className="rounded-pill h-14 w-full border-2 border-rule px-8 text-lg font-semibold text-chalk transition-colors duration-150 hover:border-chalk-dim sm:w-auto"
              >
                Keep playing
              </button>
            </div>
          </div>
        ) : (
          // Outlined rather than filled: obvious and clearly a button, without
          // reading as the thing to press next on a game that's running well.
          <button
            type="button"
            onClick={() => setConfirmingEnd(true)}
            className="rounded-pill h-14 border-2 border-danger px-8 text-lg font-semibold text-danger transition-colors duration-150 hover:bg-danger hover:text-on-accent"
          >
            End game
          </button>
        )}
      </div>
    </div>
  );
}
