"use client";

// Turns MyState + the server clock into the screen to show:
// waiting → countdown (until my_reveal_at) → revealed (reveal_seconds) → hidden.

import type { MyState, PlayerScreen } from "@/lib/types";

export function usePlayerScreen(state: MyState | null, clockOffsetMs: number): {
  screen: PlayerScreen;
  secondsLeft: number | null;
} {
  // TODO: implement with a ticking timer based on lib/server-clock.ts
  void state; void clockOffsetMs;
  return { screen: "joining", secondsLeft: null };
}
