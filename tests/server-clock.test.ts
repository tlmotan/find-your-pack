import { describe, expect, it } from "vitest";

import { computeClockOffset, msUntil, serverNow } from "@/lib/server-clock";

const T0 = Date.parse("2026-10-06T12:00:00.000Z");

describe("computeClockOffset", () => {
  it("returns +2000 when the phone is 2 s behind the server", () => {
    const phoneNow = T0 - 2_000;
    expect(computeClockOffset("2026-10-06T12:00:00.000Z", phoneNow)).toBe(2_000);
  });

  it("returns -2000 when the phone is 2 s ahead", () => {
    expect(computeClockOffset("2026-10-06T12:00:00.000Z", T0 + 2_000)).toBe(-2_000);
  });

  it("is zero when the clocks agree", () => {
    expect(computeClockOffset("2026-10-06T12:00:00.000Z", T0)).toBe(0);
  });

  it("falls back to the phone clock rather than NaN on a bad timestamp", () => {
    // NaN would propagate into every countdown and freeze the screen.
    expect(computeClockOffset("not-a-date", T0)).toBe(0);
  });
});

describe("serverNow", () => {
  it("applies the offset to the phone clock", () => {
    expect(serverNow(2_000, T0)).toBe(T0 + 2_000);
  });
});

describe("msUntil", () => {
  it("counts down to a server timestamp on the server clock, not the phone's", () => {
    // Phone is 2 s behind. The target is 3 s away in server time, so a phone
    // trusting its own clock would wait 5 s and reveal late.
    const phoneNow = T0 - 2_000;
    const offset = computeClockOffset("2026-10-06T12:00:00.000Z", phoneNow);
    const target = new Date(T0 + 3_000).toISOString();

    expect(msUntil(target, offset, phoneNow)).toBe(3_000);
    expect(msUntil(target, 0, phoneNow)).toBe(5_000); // the bug this prevents
  });

  it("goes negative once the moment has passed", () => {
    const target = new Date(T0 - 1_000).toISOString();
    expect(msUntil(target, 0, T0)).toBe(-1_000);
  });
});
