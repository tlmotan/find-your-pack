import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimeoutError, withTimeout } from "@/lib/with-timeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("withTimeout", () => {
  it("passes a value through when it arrives in time", async () => {
    const promise = withTimeout(Promise.resolve("ok"), 1000, "get_my_state");
    await expect(promise).resolves.toBe("ok");
  });

  it("passes the original rejection through untouched", async () => {
    const boom = new Error("rpc refused");
    const promise = withTimeout(Promise.reject(boom), 1000, "get_my_state");
    await expect(promise).rejects.toBe(boom);
  });

  it("rejects once the deadline passes", async () => {
    // The case this exists for: a request frozen by iOS backgrounding that
    // would otherwise never settle and would stall the poll loop for good.
    const never = new Promise<string>(() => {});
    const promise = withTimeout(never, 10_000, "get_my_state");
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("names the call and the limit, so a log says which request hung", async () => {
    const never = new Promise<string>(() => {});
    const promise = withTimeout(never, 250, "start_session");
    const assertion = expect(promise).rejects.toThrow(/start_session.*250ms/);

    await vi.advanceTimersByTimeAsync(250);
    await assertion;
  });

  it("clears its timer on success, leaving no pending handles", async () => {
    await withTimeout(Promise.resolve(1), 5000, "keepalive");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer on failure too", async () => {
    await expect(withTimeout(Promise.reject(new Error("no")), 5000, "keepalive")).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
