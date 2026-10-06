import { describe, expect, it } from "vitest";

import { POLL_MS } from "@/lib/constants";
import { pollIntervalMs } from "@/lib/poll";
import type { MyState } from "@/lib/types";

const iso = new Date("2026-10-06T12:00:00.000Z").toISOString();

describe("pollIntervalMs", () => {
  it("polls attentively before Start, because Start can land any moment", () => {
    expect(pollIntervalMs({ status: "waiting", server_now: iso })).toBe(POLL_MS.waiting);
    expect(pollIntervalMs({ status: "not_open" })).toBe(POLL_MS.waiting);
  });

  it("polls attentively with no state yet, including after a failed request", () => {
    expect(pollIntervalMs(null)).toBe(POLL_MS.waiting);
  });

  it("backs off once the group is out, when only pack size still changes", () => {
    const reveal: MyState = {
      status: "reveal",
      group: { name: "Cow", emoji: "🐮", sound_hint: "Moo!" },
      pack_size: 10,
      my_reveal_at: iso,
      reveal_seconds: 5,
      server_now: iso,
    };
    expect(pollIntervalMs(reveal)).toBe(POLL_MS.afterReveal);
    expect(pollIntervalMs({ status: "hidden", pack_size: 10 })).toBe(POLL_MS.afterReveal);
  });

  it("stops entirely once the session has ended", () => {
    // null means stop: nothing will change again, and a room full of phones
    // polling a dead session is pure waste.
    expect(pollIntervalMs({ status: "ended" })).toBeNull();
  });

  it("never polls faster after the reveal than before it", () => {
    expect(POLL_MS.afterReveal).toBeGreaterThanOrEqual(POLL_MS.waiting);
  });
});
