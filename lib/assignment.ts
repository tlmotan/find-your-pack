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
  // optionCount is the hard ceiling: Postgres can only hand out groups that
  // actually exist in session.group_options, so nothing may exceed it.
  const ceiling = Math.max(1, optionCount);

  if (override !== null) {
    // An override is the host's deliberate choice, so it may go past the
    // default cap of 10 — but never past the number of names available.
    return clamp(Math.floor(override), 1, ceiling);
  }

  // Aim for at least 3 players per pack so a pack is findable in a noisy room,
  // and keep the automatic choice to 10 groups so sounds stay distinguishable.
  const target = Math.floor(activePlayers / MIN_PER_PACK);
  return clamp(target, 1, Math.min(MAX_DEFAULT_GROUPS, ceiling));
}

/** Shuffle then assign i → i mod G. Returns a group index per player; sizes differ by ≤1. */
export function assignBalanced(playerCount: number, groupCount: number, random: () => number = Math.random): number[] {
  if (playerCount <= 0) return [];
  if (groupCount < 1) {
    throw new Error("assignBalanced: groupCount must be at least 1");
  }

  // Shuffle the player order, then deal round-robin (i mod G). Dealing in a
  // cycle is what guarantees sizes within ±1; shuffling first is what stops
  // the grouping from tracking join order, so friends who joined together
  // don't all land in the same pack.
  const order = shuffledIndices(playerCount, random);

  const groupByPlayer = new Array<number>(playerCount);
  for (const [position, player] of order.entries()) {
    groupByPlayer[player] = position % groupCount;
  }
  return groupByPlayer;
}

/** Index of the smallest group (ties → lowest index). Used for late or waking players. */
export function pickSmallestGroup(groupSizes: number[]): number {
  if (groupSizes.length === 0) {
    throw new Error("pickSmallestGroup: no groups");
  }

  // Strict `<` keeps the first of any tie, which mirrors the SQL
  // `ORDER BY count ASC, sort_order ASC` used for late assignment.
  let best = 0;
  let bestSize = Number.POSITIVE_INFINITY;
  for (const [index, size] of groupSizes.entries()) {
    if (size < bestSize) {
      best = index;
      bestSize = size;
    }
  }
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Inside-out Fisher–Yates: every permutation is equally likely, in one pass.
 * Each step places the new index i at a random earlier slot j and moves
 * whatever sat there to the end, so only already-filled slots are ever read.
 */
function shuffledIndices(count: number, random: () => number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const j = Math.floor(random() * (i + 1));
    // j === i means the slot is not filled yet, so i stays where it lands.
    indices.push(indices[j] ?? i);
    indices[j] = i;
  }
  return indices;
}
