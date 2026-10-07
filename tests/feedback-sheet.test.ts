import { describe, expect, it } from "vitest";

import {
  SHEET_DELAY_MS,
  SHEET_RISE_MS,
  isSheetInteractive,
  sheetPhaseAt,
} from "@/lib/feedback-sheet";

describe("sheetPhaseAt — the entrance sequence", () => {
  it("leaves the ended screen alone for the whole delay", () => {
    expect(sheetPhaseAt(0)).toBe("below");
    expect(sheetPhaseAt(SHEET_DELAY_MS - 1)).toBe("below");
  });

  it("starts rising the moment the delay is up", () => {
    expect(sheetPhaseAt(SHEET_DELAY_MS)).toBe("rising");
  });

  it("is still rising right up to the end of the travel", () => {
    expect(sheetPhaseAt(SHEET_DELAY_MS + SHEET_RISE_MS - 1)).toBe("rising");
  });

  it("settles exactly when the travel ends, and stays settled", () => {
    expect(sheetPhaseAt(SHEET_DELAY_MS + SHEET_RISE_MS)).toBe("settled");
    expect(sheetPhaseAt(60_000)).toBe("settled");
  });

  it("keeps the brief's timings: a short pause, then a weighty rise", () => {
    expect(SHEET_DELAY_MS).toBeGreaterThanOrEqual(150);
    expect(SHEET_DELAY_MS).toBeLessThanOrEqual(250);
    expect(SHEET_RISE_MS).toBeGreaterThanOrEqual(500);
    expect(SHEET_RISE_MS).toBeLessThanOrEqual(650);
  });
});

describe("sheetPhaseAt — reduced motion", () => {
  it("is settled from the first frame, with no delay and no travel", () => {
    expect(sheetPhaseAt(0, true)).toBe("settled");
    expect(sheetPhaseAt(SHEET_DELAY_MS, true)).toBe("settled");
  });

  it("therefore never reports a phase that would animate", () => {
    for (const t of [0, 50, SHEET_DELAY_MS, SHEET_DELAY_MS + 1, SHEET_RISE_MS]) {
      expect(sheetPhaseAt(t, true)).not.toBe("rising");
    }
  });
});

describe("isSheetInteractive", () => {
  it("only accepts input once the sheet has stopped moving", () => {
    expect(isSheetInteractive("below")).toBe(false);
    expect(isSheetInteractive("rising")).toBe(false);
    expect(isSheetInteractive("settled")).toBe(true);
  });

  it("is live immediately under reduced motion, since that starts settled", () => {
    expect(isSheetInteractive(sheetPhaseAt(0, true))).toBe(true);
  });
});
