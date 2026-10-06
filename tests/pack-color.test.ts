import { describe, expect, it } from "vitest";

import { PACK_COLOR_COUNT, packColorIndex, packColorVar } from "@/lib/pack-color";
import { THEMES } from "@/lib/themes";

describe("packColorIndex", () => {
  it("stays inside the palette for every animal preset group", () => {
    for (const group of THEMES.animals.groups) {
      const index = packColorIndex(group.name);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(PACK_COLOR_COUNT);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  it("is deterministic, so every phone in a pack agrees", () => {
    // The property the reveal depends on: same name in, same colour out.
    expect(packColorIndex("Cow")).toBe(packColorIndex("Cow"));
    expect(packColorIndex("Frog")).toBe(packColorIndex("Frog"));
  });

  it("ignores case and surrounding whitespace in custom names", () => {
    expect(packColorIndex("  cow ")).toBe(packColorIndex("Cow"));
    expect(packColorIndex("RED TEAM")).toBe(packColorIndex("red team"));
  });

  it("spreads the animal preset across most of the palette", () => {
    // Collisions are allowed, but a hash that lumped 12 groups into two or
    // three colours would make the reveal look broken. Guard the spread.
    const distinct = new Set(THEMES.animals.groups.map((g) => packColorIndex(g.name)));
    expect(distinct.size).toBeGreaterThanOrEqual(7);
  });

  it("handles an empty or symbol-only name without throwing", () => {
    for (const name of ["", "   ", "🐮", "???"]) {
      const index = packColorIndex(name);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(PACK_COLOR_COUNT);
    }
  });

  it("stays in range for a long name", () => {
    const index = packColorIndex("a".repeat(500));
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThanOrEqual(PACK_COLOR_COUNT);
  });
});

describe("packColorVar", () => {
  it("names a pack custom property that exists in globals.css", () => {
    expect(packColorVar("Cow")).toMatch(/^var\(--color-pack-([1-9]|1[0-2])\)$/);
  });
});
