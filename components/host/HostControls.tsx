"use client";

// Open lobby / Start / End buttons, enabled by status (PRD H1b, H5, H7).
// Start is disabled below MIN_PLAYERS_TO_START active players.

import type { HostState } from "@/lib/types";

type Props = {
  state: HostState;
  onOpenLobby: () => void;
  onStart: () => void;
  onEnd: () => void;
};

export function HostControls({ state, onOpenLobby, onStart, onEnd }: Props) {
  // TODO: confirmation before End; disable buttons while a request is in flight
  void state; void onOpenLobby; void onStart; void onEnd;
  return <div className="p-6">Host controls (TODO)</div>;
}
