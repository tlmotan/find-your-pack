// Realtime Broadcast: one public channel per session (ARCHITECTURE.md §6.1).
// Events carry NO data. Receivers always re-check with get_my_state, so a fake
// event sent by a prankster changes nothing.

import { getSupabase } from "./supabase/client";

export type SessionEvent = "started" | "ended";

export const channelName = (joinCode: string) => `session:${joinCode}`;

/** Host: send a data-less event to every phone in the session. */
export async function broadcastEvent(joinCode: string, event: SessionEvent): Promise<void> {
  // TODO: subscribe to channelName(joinCode), send { type: "broadcast", event, payload: {} }, then unsubscribe
  void getSupabase; void joinCode; void event;
  throw new Error("not implemented: broadcastEvent");
}

/** Player: listen for events. Returns an unsubscribe function. */
export function onSessionEvent(joinCode: string, handler: (event: SessionEvent) => void): () => void {
  // TODO: subscribe to channelName(joinCode) for "started" and "ended"; call handler
  void joinCode; void handler;
  throw new Error("not implemented: onSessionEvent");
}
