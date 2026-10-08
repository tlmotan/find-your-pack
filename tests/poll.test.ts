import { describe, expect, it } from "vitest";

import { NOT_JOINED_RECHECKS, POLL_MS } from "@/lib/constants";
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

  it("keeps asking while a lost spot can still be recovered", () => {
    // not_joined is recoverable — useMyState re-joins while these polls run — so
    // it must not stop the loop the way "ended" does.
    for (let streak = 0; streak < NOT_JOINED_RECHECKS; streak += 1) {
      expect(pollIntervalMs({ status: "not_joined" }, streak)).toBe(POLL_MS.notJoined);
    }
  });

  it("stops once the attempts at a lost spot are spent", () => {
    // By now the player has been asked to scan the QR code again, and nothing a
    // poll could return would change that.
    expect(pollIntervalMs({ status: "not_joined" }, NOT_JOINED_RECHECKS)).toBeNull();
    expect(pollIntervalMs({ status: "not_joined" }, NOT_JOINED_RECHECKS + 5)).toBeNull();
  });

  it("treats a missing streak as the first not_joined answer", () => {
    // The default matters: every other status ignores the streak, so a caller
    // that does not track it must still get a retry rather than a dead stop.
    expect(pollIntervalMs({ status: "not_joined" })).toBe(POLL_MS.notJoined);
  });

  it("stops entirely once the session has ended", () => {
    // null means stop: the row is gone, nothing will change again, and a room
    // full of phones polling a dead session is pure waste. Unlike not_joined,
    // the streak cannot buy this one another look.
    expect(pollIntervalMs({ status: "ended" })).toBeNull();
    expect(pollIntervalMs({ status: "ended" }, 0)).toBeNull();
  });

  it("never polls faster after the reveal than before it", () => {
    expect(POLL_MS.afterReveal).toBeGreaterThanOrEqual(POLL_MS.waiting);
  });
});
