// Pure assignment math (ARCHITECTURE.md §5.1–5.2).
// The real assignment runs in Postgres; these mirror it so the rules can be
// unit-tested quickly in tests/assignment.test.ts.

import { MAX_DEFAULT_GROUPS, MIN_PER_PACK } from "./constants";

/**
 * G = override ?? clamp(floor(N / 3), 1, min(10, optionCount)), never above optionCount.
 */
export function computeGroupCount(
  activePlayers: number,
  optionCount: number,
  override: number | null = null,
): number {
  // TODO: implement + tests
  void activePlayers; void optionCount; void override; void MAX_DEFAULT_GROUPS; void MIN_PER_PACK;
  throw new Error("not implemented: computeGroupCount");
}

/** Shuffle then assign i → i mod G. Returns a group index per player; sizes differ by ≤1. */
export function assignBalanced(playerCount: number, groupCount: number, random: () => number = Math.random): number[] {
  // TODO: implement + tests
  void playerCount; void groupCount; void random;
  throw new Error("not implemented: assignBalanced");
}

/** Index of the smallest group (ties → lowest index). Used for late or waking players. */
export function pickSmallestGroup(groupSizes: number[]): number {
  // TODO: implement + tests
  void groupSizes;
  throw new Error("not implemented: pickSmallestGroup");
}
