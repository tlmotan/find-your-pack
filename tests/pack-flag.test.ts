import { describe, expect, it } from "vitest";

import { PACK_FLAGS, PACK_FLAG_COUNT, packFlag, packFlagIndex } from "@/lib/pack-flag";
import { THEMES } from "@/lib/themes";

describe("the flag set", () => {
  it("has twelve distinct flags", () => {
    expect(PACK_FLAG_COUNT).toBe(12);
    expect(new Set(PACK_FLAGS.map((f) => f.id)).size).toBe(12);
  });

  it("has no white-ground flag", () => {
    // The app sits on deep navy because a bright full-screen field is a
    // flashbulb in a dim hall. A flag that is wholly white, filling a phone,
    // is exactly that — so white appears only as a mark, or as half of one.
    for (const flag of PACK_FLAGS) {
      expect(flag.whiteGround).toBe(false);
    }
  });

  it("never uses red and blue in the same flag", () => {
    // Those two sit at 1.36:1 against each other, so a flag carrying both can
    // smear into one shape across a dim room. Never using both is a stronger
    // guarantee than trying to keep them apart within a design.
    for (const flag of PACK_FLAGS) {
      const colors: readonly string[] = flag.colors;
      expect(colors.includes("red") && colors.includes("blue")).toBe(false);
    }
  });
});

describe("packFlagIndex", () => {
  it("stays inside the set for every animal in the preset", () => {
    for (const group of THEMES.animals.groups) {
      const index = packFlagIndex(group.name);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PACK_FLAG_COUNT);
      expect(Number.isInteger(index)).toBe(true);
    }
  });

  it("is deterministic, so every phone in a pack flies the same flag", () => {
    expect(packFlagIndex("Cow")).toBe(packFlagIndex("Cow"));
    expect(packFlagIndex("Frog")).toBe(packFlagIndex("Frog"));
  });

  it("ignores case and surrounding whitespace in custom names", () => {
    expect(packFlagIndex("  cow ")).toBe(packFlagIndex("Cow"));
    expect(packFlagIndex("RED TEAM")).toBe(packFlagIndex("red team"));
  });

  it("spreads the animal preset across most of the set", () => {
    // Collisions are tolerable because the group's name is always shown beside
    // the flag, but a hash that lumped twelve groups onto three flags would
    // make the reveal look broken.
    const distinct = new Set(THEMES.animals.groups.map((g) => packFlagIndex(g.name)));
    expect(distinct.size).toBeGreaterThanOrEqual(7);
  });

  it("handles an empty, symbol-only, or very long name without throwing", () => {
    for (const name of ["", "   ", "🐮", "???", "a".repeat(500)]) {
      const index = packFlagIndex(name);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PACK_FLAG_COUNT);
    }
  });
});

describe("packFlag", () => {
  it("returns a drawable flag for any name", () => {
    const flag = packFlag("Cow");
    expect(PACK_FLAGS).toContain(flag);
    expect(flag.letter).toHaveLength(1);
  });
});
