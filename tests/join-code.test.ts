import { describe, expect, it } from "vitest";

import { JOIN_CODE_LENGTH, joinCodeError, normalizeJoinCode } from "@/lib/join-code";

describe("normalizeJoinCode", () => {
  it("uppercases what the player types", () => {
    expect(normalizeJoinCode("a7kp2m")).toBe("A7KP2M");
  });

  it("drops spaces, dashes and punctuation", () => {
    expect(normalizeJoinCode("A7K-P2M")).toBe("A7KP2M");
    expect(normalizeJoinCode(" a7 kp 2m ")).toBe("A7KP2M");
  });

  it("never exceeds the code length", () => {
    expect(normalizeJoinCode("A7KP2MZZZZ")).toHaveLength(JOIN_CODE_LENGTH);
  });

  it("keeps lookalikes so the error can explain them", () => {
    // Dropping these mid-keystroke would read as a broken keyboard.
    expect(normalizeJoinCode("A0KP2M")).toBe("A0KP2M");
  });

  it("returns an empty string for an empty or symbol-only entry", () => {
    expect(normalizeJoinCode("")).toBe("");
    expect(normalizeJoinCode("---")).toBe("");
  });
});

describe("joinCodeError", () => {
  it("accepts a valid code", () => {
    expect(joinCodeError("A7KP2M")).toBeNull();
    expect(joinCodeError("a7kp2m")).toBeNull();
  });

  it("asks for a code when the field is empty", () => {
    expect(joinCodeError("")).toMatch(/enter the 6-character code/i);
  });

  it("explains the excluded lookalikes before complaining about length", () => {
    expect(joinCodeError("A0KP2M")).toMatch(/never use/i);
    expect(joinCodeError("AO")).toMatch(/never use/i);
  });

  it("names the expected length for a short code", () => {
    expect(joinCodeError("A7K")).toMatch(/6 characters/i);
  });

  it("rejects a full-length code outside the alphabet", () => {
    // Every message must name a recovery, not just say "invalid".
    const message = joinCodeError("A7KP2M".slice(0, 5) + "0");
    expect(message).not.toBeNull();
    expect(message).toMatch(/check the host's screen/i);
  });
});
