import { describe, expect, it } from "vitest";

import { assignBalanced, computeGroupCount, pickSmallestGroup } from "../lib/assignment";
import { MAX_DEFAULT_GROUPS } from "../lib/constants";

/** Deterministic stand-in for Math.random so shuffles are reproducible in tests. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // xorshift32: good enough to spread the shuffle, and repeatable.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}

function sizesOf(groupByPlayer: number[], groupCount: number): number[] {
  const sizes = new Array<number>(groupCount).fill(0);
  for (const group of groupByPlayer) sizes[group] = (sizes[group] ?? 0) + 1;
  return sizes;
}

describe("computeGroupCount", () => {
  it("60 active players → 10 groups", () => {
    expect(computeGroupCount(60, 12)).toBe(10);
  });

  it("12 active players → 4 groups (≥3 per pack)", () => {
    expect(computeGroupCount(12, 12)).toBe(4);
  });

  it("1 active player → 1 group", () => {
    expect(computeGroupCount(1, 12)).toBe(1);
  });

  it("0 active players → 1 group", () => {
    // Start requires ≥2 active players, so this only guards the lower clamp.
    expect(computeGroupCount(0, 12)).toBe(1);
  });

  it("never more groups than group options (4 custom names, 40 players → 4)", () => {
    expect(computeGroupCount(40, 4)).toBe(4);
  });

  it("never exceeds the default cap of 10 for very large sessions", () => {
    expect(computeGroupCount(300, 20)).toBe(MAX_DEFAULT_GROUPS);
  });

  it("override is used, and may go past the default cap of 10", () => {
    expect(computeGroupCount(12, 20, 7)).toBe(7);
    expect(computeGroupCount(300, 20, 15)).toBe(15);
  });

  it("override above the option count is capped at the option count", () => {
    expect(computeGroupCount(40, 4, 9)).toBe(4);
  });

  it("override below 1 is clamped to 1", () => {
    expect(computeGroupCount(40, 10, 0)).toBe(1);
  });
});

describe("assignBalanced", () => {
  it("group sizes differ by at most 1 for N = 1–200", () => {
    const random = seededRandom(20_251_006);
    for (let n = 1; n <= 200; n += 1) {
      const groupCount = computeGroupCount(n, 12);
      const sizes = sizesOf(assignBalanced(n, groupCount, random), groupCount);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  it("assigns every player exactly one valid group", () => {
    const groupByPlayer = assignBalanced(37, 6, seededRandom(7));
    expect(groupByPlayer).toHaveLength(37);
    for (const group of groupByPlayer) {
      expect(Number.isInteger(group)).toBe(true);
      expect(group).toBeGreaterThanOrEqual(0);
      expect(group).toBeLessThan(6);
    }
  });

  it("uses every group when N ≥ G", () => {
    const groupByPlayer = assignBalanced(10, 10, seededRandom(3));
    expect(new Set(groupByPlayer).size).toBe(10);
  });

  it("0 players → no assignments", () => {
    expect(assignBalanced(0, 5, seededRandom(1))).toEqual([]);
  });

  it("1 player → the first group", () => {
    expect(assignBalanced(1, 4, seededRandom(1))).toEqual([0]);
  });

  it("more groups than players leaves the extra groups empty", () => {
    const groupByPlayer = assignBalanced(3, 10, seededRandom(42));
    expect(groupByPlayer).toHaveLength(3);
    // Round-robin from position 0, so exactly groups 0..2 are used.
    expect(new Set(groupByPlayer).size).toBe(3);
    expect(Math.max(...groupByPlayer)).toBeLessThan(3);
  });

  it("shuffles, so assignment does not simply follow join order", () => {
    const groupByPlayer = assignBalanced(50, 10, seededRandom(99));
    const inJoinOrder = Array.from({ length: 50 }, (_, i) => i % 10);
    expect(groupByPlayer).not.toEqual(inJoinOrder);
  });

  it("is deterministic for a given random source", () => {
    expect(assignBalanced(20, 4, seededRandom(5))).toEqual(assignBalanced(20, 4, seededRandom(5)));
  });

  it("rejects a group count below 1", () => {
    expect(() => assignBalanced(5, 0)).toThrow();
  });
});

describe("pickSmallestGroup", () => {
  it("returns the smallest group", () => {
    expect(pickSmallestGroup([5, 5, 2, 5])).toBe(2);
  });

  it("breaks ties with the lowest index", () => {
    expect(pickSmallestGroup([3, 1, 1, 4])).toBe(1);
    expect(pickSmallestGroup([2, 2, 2])).toBe(0);
  });

  it("handles a single group", () => {
    expect(pickSmallestGroup([17])).toBe(0);
  });

  it("prefers an empty group", () => {
    expect(pickSmallestGroup([4, 4, 0])).toBe(2);
  });

  it("rejects an empty group list", () => {
    expect(() => pickSmallestGroup([])).toThrow();
  });
});
