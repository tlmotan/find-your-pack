import { describe, expect, it } from "vitest";

import { FEEDBACK } from "@/lib/constants";
import { countsAsPlayed } from "@/lib/feedback-sheet";
import { feedbackSchema } from "@/lib/validation";
import type { PlayerScreen } from "@/lib/types";

describe("countsAsPlayed", () => {
  it("is true only for screens that mean a flag was actually flown", () => {
    expect(countsAsPlayed("revealed")).toBe(true);
    expect(countsAsPlayed("hidden")).toBe(true);
  });

  it("is false for everyone who never played", () => {
    // "ended" covers a mistyped join code and an expired session as well as a
    // game the host ended, so none of them may open a feedback form.
    const never: PlayerScreen[] = [
      "joining",
      "not_open",
      "waiting",
      "countdown",
      "lost_spot",
      "ended",
    ];
    for (const screen of never) expect(countsAsPlayed(screen)).toBe(false);
  });
});

describe("feedbackSchema", () => {
  const valid = { rating: 4, reasons: ["Easy to join"], comment: "Great fun", join_code: "FKEC5R" };

  it("accepts a complete response", () => {
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts the empty comment most players will send", () => {
    expect(feedbackSchema.safeParse({ ...valid, comment: "", reasons: [] }).success).toBe(true);
  });

  it("rejects a rating outside the five faces", () => {
    for (const rating of [0, 6, 2.5, -1]) {
      expect(feedbackSchema.safeParse({ ...valid, rating }).success).toBe(false);
    }
  });

  it("rejects a comment past the cap the SQL CHECK also enforces", () => {
    const at = "x".repeat(FEEDBACK.commentMaxLength);
    expect(feedbackSchema.safeParse({ ...valid, comment: at }).success).toBe(true);
    expect(feedbackSchema.safeParse({ ...valid, comment: `${at}x` }).success).toBe(false);
  });

  it("rejects an unbounded reasons array", () => {
    const tooMany = Array.from({ length: FEEDBACK.maxReasons + 1 }, (_, i) => `r${i}`);
    expect(feedbackSchema.safeParse({ ...valid, reasons: tooMany }).success).toBe(false);
  });

  it("rejects a join code that isn't one, but allows none at all", () => {
    expect(feedbackSchema.safeParse({ ...valid, join_code: "abc" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...valid, join_code: null }).success).toBe(true);
  });
});
