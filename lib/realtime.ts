// Realtime Broadcast: one public channel per session (ARCHITECTURE.md §6.1).
// Events carry NO data. Receivers always re-check with get_my_state, so a fake
// event sent by a prankster changes nothing.

import { getSupabase } from "./supabase/client";

// "opened" lets phones already waiting at the door join themselves; the other
// two move phones already in the game.
export type SessionEvent = "opened" | "started" | "ended";

export const channelName = (joinCode: string) => `session:${joinCode}`;

/** Host: send a data-less event to every phone in the session. */
export async function broadcastEvent(joinCode: string, event: SessionEvent): Promise<void> {
  const supabase = getSupabase();
  const channel = supabase.channel(channelName(joinCode));

  try {
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          reject(new Error(`broadcast channel ${status}`));
        }
      });
    });

    // Empty payload on purpose (hard rule 6): the group must never travel over
    // a channel anyone can subscribe to.
    await channel.send({ type: "broadcast", event, payload: {} });
  } finally {
    // The host page sends one event and is done; leaving the socket open would
    // hold a connection for the rest of the event.
    await supabase.removeChannel(channel);
  }
}

/** Player: listen for events. Returns an unsubscribe function. */
export function onSessionEvent(joinCode: string, handler: (event: SessionEvent) => void): () => void {
  const supabase = getSupabase();
  const channel = supabase.channel(channelName(joinCode));

  channel
    .on("broadcast", { event: "opened" }, () => handler("opened"))
    .on("broadcast", { event: "started" }, () => handler("started"))
    .on("broadcast", { event: "ended" }, () => handler("ended"))
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
