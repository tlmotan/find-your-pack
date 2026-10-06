import { describe, expect, it } from "vitest";

import { connectionView } from "@/lib/connection";
import { OFFLINE_AFTER_FAILURES } from "@/lib/constants";
import type { MyState } from "@/lib/types";

const iso = new Date("2026-10-07T12:00:00.000Z").toISOString();
const waiting: MyState = { status: "waiting", server_now: iso };
const reveal: MyState = {
  status: "reveal",
  group: { name: "Cow", emoji: "🐮", sound_hint: "Moo!" },
  pack_size: 3,
  my_reveal_at: iso,
  reveal_seconds: 15,
  server_now: iso,
};

describe("connectionView", () => {
  it("says nothing while requests are succeeding", () => {
    expect(connectionView(waiting, 0)).toBe("ok");
    expect(connectionView(reveal, 0)).toBe("ok");
  });

  it("stays quiet about a single dropped request", () => {
    // One failure on venue wifi is normal and not worth telling anyone about.
    expect(connectionView(waiting, 1)).toBe("ok");
  });

  it("admits it is reconnecting once failures persist", () => {
    expect(connectionView(waiting, OFFLINE_AFTER_FAILURES)).toBe("reconnecting");
    expect(connectionView(waiting, OFFLINE_AFTER_FAILURES + 5)).toBe("reconnecting");
  });

  it("never reports lost while there is a screen to show", () => {
    // The regression this guards: a player came back from another app and had
    // their game replaced by an error, with perfectly good state in hand.
    for (const failures of [1, 2, 10, 500]) {
      expect(connectionView(reveal, failures)).not.toBe("lost");
    }
  });

  it("reports lost only when nothing has ever loaded", () => {
    expect(connectionView(null, 1)).toBe("lost");
    expect(connectionView(null, 9)).toBe("lost");
  });

  it("treats the very first in-flight request as fine, not lost", () => {
    // No state and no failures yet just means we have not heard back.
    expect(connectionView(null, 0)).toBe("ok");
  });
});
