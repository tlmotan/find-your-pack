import { describe, expect, it } from "vitest";

import { isRetryablePhase, type JoinPhase } from "@/lib/join-phase";

describe("isRetryablePhase", () => {
  it("keeps trying while the host has not opened the lobby", () => {
    // The regression this guards: people scan the QR while the host is still
    // setting up, and must not be stranded on a dead screen waiting for the
    // idea of refreshing to occur to them.
    expect(isRetryablePhase("not_open")).toBe(true);
  });

  it("keeps trying after a failed request", () => {
    // Venue wifi drops one request constantly; that is not a reason to give up.
    expect(isRetryablePhase("error")).toBe(true);
  });

  it("stops on a code that can never work", () => {
    expect(isRetryablePhase("bad_code")).toBe(false);
  });

  it("stops once the session is gone", () => {
    // end_session deletes the row; nothing will bring it back.
    expect(isRetryablePhase("ended")).toBe(false);
  });

  it("does not retry the attempt already in flight", () => {
    expect(isRetryablePhase("joining")).toBe(false);
  });

  it("covers every phase", () => {
    const all: JoinPhase[] = ["joining", "bad_code", "not_open", "ended", "error"];
    for (const phase of all) expect(typeof isRetryablePhase(phase)).toBe("boolean");
  });
});
