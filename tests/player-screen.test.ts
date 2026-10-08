import { describe, expect, it } from "vitest";

import { REVEAL_GRACE_SECONDS } from "@/lib/constants";
import {
  WIPE_COVER_MS,
  WIPE_LEAD_MS,
  derivePlayerScreen,
  isEndedWipe,
  isRevealVisible,
  isWipeCovering,
} from "@/lib/player-screen";
import { computeClockOffset } from "@/lib/server-clock";
import type { MyState } from "@/lib/types";

const T0 = Date.parse("2026-10-06T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

/** A reveal state whose countdown ends `inMs` from T0. */
function revealState(inMs: number, revealSeconds = 5): MyState {
  return {
    status: "reveal",
    group: { name: "Cow", emoji: "🐮", sound_hint: "Moo!" },
    pack_size: 10,
    my_reveal_at: iso(T0 + inMs),
    reveal_seconds: revealSeconds,
    server_now: iso(T0),
  };
}

describe("derivePlayerScreen — pass-through states", () => {
  it("maps each non-reveal status to its screen", () => {
    const cases: [MyState | null, string][] = [
      [null, "joining"],
      [{ status: "not_open" }, "not_open"],
      [{ status: "waiting", server_now: iso(T0) }, "waiting"],
      [{ status: "hidden", pack_size: 10 }, "hidden"],
      // not_joined is its own screen, never "ended": the game is probably still
      // running, and the player is asked to scan the QR code again.
      [{ status: "not_joined" }, "lost_spot"],
      [{ status: "ended" }, "ended"],
    ];
    for (const [state, screen] of cases) {
      expect(derivePlayerScreen(state, { offsetMs: 0, nowMs: T0 }).screen).toBe(screen);
    }
  });

  it("gives no timer to screens that have none", () => {
    expect(derivePlayerScreen({ status: "waiting", server_now: iso(T0) }, { offsetMs: 0 }).secondsLeft).toBeNull();
  });
});

describe("derivePlayerScreen — countdown", () => {
  it("counts down to my_reveal_at", () => {
    const got = derivePlayerScreen(revealState(3_000), { offsetMs: 0, nowMs: T0 });
    expect(got.screen).toBe("countdown");
    expect(got.secondsLeft).toBe(3);
  });

  it("uses the server clock, so a skewed phone still reveals on time", () => {
    // Phone is 2 s behind. Reveal is 3 s away in server time.
    const phoneNow = T0 - 2_000;
    const offset = computeClockOffset(iso(T0), phoneNow);

    const corrected = derivePlayerScreen(revealState(3_000), { offsetMs: offset, nowMs: phoneNow });
    expect(corrected.secondsLeft).toBe(3);

    // Trusting the phone's own clock would show 5 s and reveal late.
    const naive = derivePlayerScreen(revealState(3_000), { offsetMs: 0, nowMs: phoneNow });
    expect(naive.secondsLeft).toBe(5);
  });

  it("switches to revealed the instant the countdown reaches zero", () => {
    expect(derivePlayerScreen(revealState(0), { offsetMs: 0, nowMs: T0 }).screen).toBe("revealed");
  });
});

describe("derivePlayerScreen — reveal window", () => {
  it("shows the group for reveal_seconds after my_reveal_at", () => {
    const state = revealState(0, 5);
    const at = (ms: number) => derivePlayerScreen(state, { offsetMs: 0, nowMs: T0 + ms });

    expect(at(0).screen).toBe("revealed");
    expect(at(0).secondsLeft).toBe(5);
    expect(at(4_999).screen).toBe("revealed");
    expect(at(5_000).screen).toBe("hidden");
    expect(at(60_000).screen).toBe("hidden");
  });

  it("hides no later than the server would", () => {
    // The server's window_end carries an extra REVEAL_GRACE_SECONDS. The client
    // must land inside that, never past it (hard rule 5).
    const revealSeconds = 5;
    const state = revealState(0, revealSeconds);
    const serverWindowEndMs = (revealSeconds + REVEAL_GRACE_SECONDS) * 1000;

    const justBeforeServerEnd = derivePlayerScreen(state, {
      offsetMs: 0,
      nowMs: T0 + serverWindowEndMs - 1,
    });
    expect(justBeforeServerEnd.screen).toBe("hidden");
  });

  it("gives a phone unlocked long after Start its full reveal (P7)", () => {
    // Locked at Start: my_reveal_at passed 60 s ago. The server anchors the
    // window to when it first handed over the group, so the phone must not
    // flash straight to hidden.
    const wokeAt = T0 + 60_000;
    const state = revealState(-60_000, 5);

    const onWake = derivePlayerScreen(state, {
      offsetMs: 0,
      nowMs: wokeAt,
      revealAnchorMs: wokeAt,
    });
    expect(onWake.screen).toBe("revealed");
    expect(onWake.secondsLeft).toBe(5);

    const later = derivePlayerScreen(state, {
      offsetMs: 0,
      nowMs: wokeAt + 5_000,
      revealAnchorMs: wokeAt,
    });
    expect(later.screen).toBe("hidden");
  });

  it("without an anchor, a late phone hides immediately rather than over-showing", () => {
    // Failing closed: the group is never shown longer than the server allows.
    const state = revealState(-60_000, 5);
    expect(derivePlayerScreen(state, { offsetMs: 0, nowMs: T0 + 60_000 }).screen).toBe("hidden");
  });

  it("ignores an anchor earlier than my_reveal_at", () => {
    // A stale anchor must not shorten the window.
    const state = revealState(0, 5);
    const got = derivePlayerScreen(state, {
      offsetMs: 0,
      nowMs: T0 + 1_000,
      revealAnchorMs: T0 - 30_000,
    });
    expect(got.screen).toBe("revealed");
    expect(got.secondsLeft).toBe(4);
  });

  it("shows the group rather than freezing on an unparseable my_reveal_at", () => {
    const broken: MyState = { ...(revealState(0) as Extract<MyState, { status: "reveal" }>), my_reveal_at: "nope" };
    expect(derivePlayerScreen(broken, { offsetMs: 0, nowMs: T0 }).screen).toBe("revealed");
  });
});

describe("isRevealVisible", () => {
  it("is false during the countdown and true once it ends", () => {
    expect(isRevealVisible(revealState(3_000), 0, T0)).toBe(false);
    expect(isRevealVisible(revealState(0), 0, T0)).toBe(true);
    expect(isRevealVisible(revealState(-60_000), 0, T0)).toBe(true);
  });

  it("is false for every non-reveal state", () => {
    expect(isRevealVisible(null, 0, T0)).toBe(false);
    expect(isRevealVisible({ status: "waiting", server_now: iso(T0) }, 0, T0)).toBe(false);
    expect(isRevealVisible({ status: "hidden", pack_size: 3 }, 0, T0)).toBe(false);
  });
});

describe("isWipeCovering", () => {
  it("covers the 5 staggered columns in 440ms: 200ms each, last one 240ms late", () => {
    expect(WIPE_COVER_MS).toBe(440);
  });

  it("starts early enough that the flag is covered before the hide, even on a late tick", () => {
    // Hard rule 5: the wipe may hide early, never late.
    expect(WIPE_LEAD_MS).toBeGreaterThanOrEqual(WIPE_COVER_MS + 200);
  });

  it("is false for most of the reveal and true in its last WIPE_LEAD_MS", () => {
    const state = revealState(0, 5);
    const at = (ms: number) => isWipeCovering(derivePlayerScreen(state, { offsetMs: 0, nowMs: T0 + ms }));

    expect(at(0)).toBe(false);
    expect(at(5_000 - WIPE_LEAD_MS - 1)).toBe(false);
    expect(at(5_000 - WIPE_LEAD_MS)).toBe(true);
    expect(at(4_999)).toBe(true);
  });

  it("does not delay the hide: the group is gone at hideAt as before", () => {
    const got = derivePlayerScreen(revealState(0, 5), { offsetMs: 0, nowMs: T0 + 5_000 });
    expect(got.screen).toBe("hidden");
    expect(isWipeCovering(got)).toBe(false);
  });

  it("is false outside a reveal", () => {
    expect(isWipeCovering({ screen: "countdown", secondsLeft: 0.1 })).toBe(false);
    expect(isWipeCovering({ screen: "hidden", secondsLeft: null })).toBe(false);
  });
});

describe("isEndedWipe", () => {
  it("fires on hidden → ended", () => {
    expect(isEndedWipe("hidden", "ended")).toBe(true);
  });

  it("never fires on a transition involving a reveal", () => {
    // The hook holds the old screen on while the columns close. Holding
    // "revealed" would keep a group on screen past its window, which hard
    // rule 5 forbids — so no reveal transition may ever animate this way.
    const screens = ["joining", "not_open", "waiting", "countdown", "revealed", "hidden", "ended"] as const;
    for (const to of screens) expect(isEndedWipe("revealed", to)).toBe(false);
    for (const from of screens) expect(isEndedWipe(from, "revealed")).toBe(false);
  });

  it("does not fire on any other pair", () => {
    expect(isEndedWipe("hidden", "waiting")).toBe(false);
    expect(isEndedWipe("waiting", "ended")).toBe(false);
    expect(isEndedWipe("countdown", "ended")).toBe(false);
    expect(isEndedWipe("ended", "ended")).toBe(false);
    expect(isEndedWipe("joining", "ended")).toBe(false);
  });
});
