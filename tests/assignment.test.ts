import { describe, expect, it } from "vitest";

import {
  assignBalanced,
  computeGroupCount,
  pickSmallestGroup,
  pickSmallestGroupAvoiding,
  reassignAvoidingPrevious,
} from "../lib/assignment";
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

describe("pickSmallestGroupAvoiding", () => {
  it("skips the group to avoid when another is just as small", () => {
    expect(pickSmallestGroupAvoiding([2, 2, 2], 0)).toBe(1);
  });

  it("still takes the smallest when the group to avoid is the only smallest", () => {
    // ±1 matters more than a repeat for a single waking phone.
    expect(pickSmallestGroupAvoiding([1, 4, 4], 0)).toBe(0);
  });

  it("behaves like pickSmallestGroup when there is nothing to avoid", () => {
    expect(pickSmallestGroupAvoiding([4, 4, 0], null)).toBe(2);
    expect(pickSmallestGroupAvoiding([2, 2, 2], null)).toBe(0);
  });

  it("keeps the lowest-index tie-break among the groups it will consider", () => {
    expect(pickSmallestGroupAvoiding([3, 3, 3, 3], 1)).toBe(0);
    expect(pickSmallestGroupAvoiding([3, 3, 3, 3], 0)).toBe(1);
  });

  it("handles a single group by returning it", () => {
    expect(pickSmallestGroupAvoiding([17], 0)).toBe(0);
  });

  it("rejects an empty group list", () => {
    expect(() => pickSmallestGroupAvoiding([], null)).toThrow();
  });
});

describe("reassignAvoidingPrevious", () => {
  /** A balanced previous round: the deal start_session would have produced. */
  function previousRound(playerCount: number, groupCount: number, seed = 1): number[] {
    return assignBalanced(playerCount, groupCount, seededRandom(seed));
  }

  it("never leaves a player on the group they had, across realistic rooms", () => {
    // PRD A6. The ranges cover a youth service (60–150) and both ends of the
    // group list (2–20 names).
    for (const groupCount of [2, 3, 5, 10, 20]) {
      for (const playerCount of [2, 3, 7, 60, 120, 150, 200]) {
        if (playerCount < groupCount) continue;
        const prev = previousRound(playerCount, groupCount, playerCount + groupCount);
        const next = reassignAvoidingPrevious(prev, groupCount, seededRandom(playerCount * 31 + groupCount));
        const repeats = next.filter((group, player) => group === prev[player]);
        expect(repeats, `N=${playerCount} G=${groupCount}`).toEqual([]);
      }
    }
  });

  it("keeps group sizes within ±1", () => {
    // PRD A2. Swapping two players' groups cannot change a size, so this holds
    // however much repair the deal needed.
    for (const groupCount of [2, 3, 5, 10, 20]) {
      for (const playerCount of [2, 7, 60, 121, 150, 200]) {
        if (playerCount < groupCount) continue;
        const prev = previousRound(playerCount, groupCount, playerCount);
        const next = reassignAvoidingPrevious(prev, groupCount, seededRandom(playerCount + 7));
        const sizes = sizesOf(next, groupCount);
        expect(Math.max(...sizes) - Math.min(...sizes), `N=${playerCount} G=${groupCount}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives every player exactly one valid group", () => {
    const prev = previousRound(60, 10);
    const next = reassignAvoidingPrevious(prev, 10, seededRandom(99));
    expect(next).toHaveLength(60);
    for (const group of next) {
      expect(Number.isInteger(group)).toBe(true);
      expect(group).toBeGreaterThanOrEqual(0);
      expect(group).toBeLessThan(10);
    }
  });

  it("leaves players with no previous group unconstrained", () => {
    // Someone who joined after the last round was dealt, so they have no animal
    // to avoid. They must still be dealt a group.
    const prev: (number | null)[] = [null, null, null, null, null, null];
    const next = reassignAvoidingPrevious(prev, 3, seededRandom(5));
    expect(sizesOf(next, 3)).toEqual([2, 2, 2]);
  });

  it("mixes a previous pack across the new ones once there are 3+ groups", () => {
    // The point of the game: a round-1 pack must not land intact in one
    // round-2 pack, which is what rotating whole packs would have done.
    const groupCount = 5;
    const prev = previousRound(100, groupCount, 3);
    const next = reassignAvoidingPrevious(prev, groupCount, seededRandom(42));

    const oldPack = prev.map((group, player) => ({ group, player })).filter((p) => p.group === 0);
    const landedIn = new Set(oldPack.map((p) => next[p.player]));
    // 20 players spread over the 4 groups that aren't their own.
    expect(landedIn.size).toBe(groupCount - 1);
  });

  it("swaps the room over when there are only two groups", () => {
    // With G=2 "a different animal" forces every pack to move intact; there is
    // no other arrangement. Sizes must still hold.
    const prev = previousRound(40, 2, 11);
    const next = reassignAvoidingPrevious(prev, 2, seededRandom(12));
    for (const [player, group] of next.entries()) expect(group).not.toBe(prev[player]);
    expect(sizesOf(next, 2)).toEqual([20, 20]);
  });

  it("deranges two packs even when the headcount is odd", () => {
    // The tightest case there is: a full swap of two packs needs the two sizes
    // to swap, which the generic round-robin deal cannot produce on its own.
    // Left one forced repeat before two packs got their own branch.
    for (const playerCount of [3, 5, 41, 151]) {
      const prev = previousRound(playerCount, 2, playerCount);
      const next = reassignAvoidingPrevious(prev, 2, seededRandom(playerCount));
      expect(next.filter((group, player) => group === prev[player]), `N=${playerCount}`).toEqual([]);
      const sizes = sizesOf(next, 2);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBe(1);
    }
  });

  it("accepts the repeat when there is only one group", () => {
    // Nowhere else to send anyone, and failing the round would be worse.
    const next = reassignAvoidingPrevious([0, 0, 0], 1, seededRandom(1));
    expect(next).toEqual([0, 0, 0]);
  });

  it("is deterministic for a seeded random", () => {
    const prev = previousRound(60, 10, 8);
    const a = reassignAvoidingPrevious(prev, 10, seededRandom(2024));
    const b = reassignAvoidingPrevious(prev, 10, seededRandom(2024));
    expect(a).toEqual(b);
  });

  it("handles a room where no player had a group at all", () => {
    const next = reassignAvoidingPrevious([null, null], 2, seededRandom(3));
    expect(sizesOf(next, 2)).toEqual([1, 1]);
  });
});
