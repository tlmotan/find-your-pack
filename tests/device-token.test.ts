import { describe, expect, it } from "vitest";

import { getDeviceToken, type TokenStorage } from "@/lib/device-token";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: TokenStorage = {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
  return { storage, data };
}

describe("getDeviceToken", () => {
  it("creates a token on first use and saves it", () => {
    const { storage, data } = fakeStorage();
    const token = getDeviceToken(storage);

    expect(token).toBeTruthy();
    expect(Object.values(data)).toContain(token);
  });

  it("returns the same token on every later call", () => {
    // This is the whole contract: a refresh must rejoin as the same player and
    // keep the same group (PRD P6).
    const { storage } = fakeStorage();
    expect(getDeviceToken(storage)).toBe(getDeviceToken(storage));
  });

  it("reuses a token already in storage rather than minting a new one", () => {
    const { storage } = fakeStorage({ "fyp.device_token": "existing-token" });
    expect(getDeviceToken(storage)).toBe("existing-token");
  });

  it("gives different browsers different tokens", () => {
    const a = fakeStorage();
    const b = fakeStorage();
    expect(getDeviceToken(a.storage)).not.toBe(getDeviceToken(b.storage));
  });

  it("still returns a usable token when storage is unavailable", () => {
    // Private mode and hardened browsers: the player must still be able to play.
    expect(getDeviceToken(null)).toBeTruthy();
  });

  it("keeps one in-memory token when storage throws", () => {
    const throwing: TokenStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(getDeviceToken(throwing)).toBe(getDeviceToken(throwing));
  });

  it("does not look like personal data", () => {
    const { storage } = fakeStorage();
    const token = getDeviceToken(storage);
    expect(token).not.toMatch(/@/);
    expect(token.length).toBeGreaterThanOrEqual(16);
  });
});
