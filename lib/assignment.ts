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

/**
 * Index of the smallest group, preferring one that isn't `avoid` (ties → lowest index).
 * Used for a player who arrived late or whose phone was asleep when the round was dealt.
 *
 * Size wins over avoidance on purpose: letting "a different pack than last round"
 * outrank size would let a handful of waking phones all skip the smallest pack and
 * push sizes past ±1. So the no-repeat rule is absolute for a round's deal
 * (reassignAvoidingPrevious) and a tie-break here.
 */
export function pickSmallestGroupAvoiding(groupSizes: number[], avoid: number | null): number {
  if (groupSizes.length === 0) {
    throw new Error("pickSmallestGroupAvoiding: no groups");
  }

  const smallest = Math.min(...groupSizes);
  // Among the groups tied for smallest, the first that isn't the one to avoid.
  for (const [index, size] of groupSizes.entries()) {
    if (size === smallest && index !== avoid) return index;
  }

  // The group to avoid is the only smallest one. Take it: ±1 matters more.
  return pickSmallestGroup(groupSizes);
}

/**
 * Deal everyone again so that nobody keeps the group they had last round (PRD A6),
 * while sizes stay within ±1 (PRD A2).
 *
 * `prevGroupByPlayer[i]` is player i's group last round, or null if they had none.
 * Returns a group index per player.
 *
 * Mirrors _deal_round(…, p_avoid_previous => true) in the e1 migration — that SQL is
 * what actually runs; this exists so the algorithm can be proved in tests.
 *
 * Rotating whole packs (new = old + 1) would also guarantee a change, but it moves
 * every pack intact, so the same people find each other again. Instead: deal at
 * random, then repair the players who kept their group ("collisions") by swapping.
 * A swap exchanges two group indexes, so it can never change a pack's size.
 *
 * Two groups is handled separately and first, because the answer there is forced —
 * everyone crosses over — and it is also the one case the repair below cannot
 * always finish (see Pass B).
 *
 *   Pass A — two collisions in different groups fix each other in one swap.
 *   Pass B — after Pass A every remaining collision sits in the same group, so each
 *            needs an outside partner: a non-colliding player elsewhere whose own
 *            previous group isn't the one we're leaving. Such a partner always
 *            exists once there are 3+ groups: it could only be missing if every
 *            player outside group X had come from X, which balanced sizes make
 *            impossible unless G <= 2.
 *
 * Anything still colliding is accepted rather than thrown: at a live event, one
 * player repeating an animal beats failing the round.
 */
export function reassignAvoidingPrevious(
  prevGroupByPlayer: (number | null)[],
  groupCount: number,
  random: () => number = Math.random,
): number[] {
  const dealt = assignBalanced(prevGroupByPlayer.length, groupCount, random);

  // With one group there is nowhere else to send anyone.
  if (groupCount < 2) return dealt;

  const prevOf = (player: number): number | null => prevGroupByPlayer[player] ?? null;

  // Two groups: everyone crosses over. Sizes stay within ±1 because the previous
  // two sizes were, and this only exchanges them. Anyone with no previous group
  // has nothing to avoid, so they fill whichever side is smaller.
  if (groupCount === 2) {
    const crossed = new Array<number>(prevGroupByPlayer.length);
    const sizes = [0, 0];
    for (const player of range(prevGroupByPlayer.length)) {
      const prev = prevOf(player);
      if (prev === null) continue;
      const group = 1 - prev;
      crossed[player] = group;
      sizes[group] = (sizes[group] ?? 0) + 1;
    }
    for (const player of range(prevGroupByPlayer.length)) {
      if (prevOf(player) !== null) continue;
      const group = (sizes[0] ?? 0) <= (sizes[1] ?? 0) ? 0 : 1;
      crossed[player] = group;
      sizes[group] = (sizes[group] ?? 0) + 1;
    }
    return crossed;
  }

  const groupByPlayer = dealt;

  // An accessor rather than raw indexing, because strict mode types every index
  // as possibly undefined. -1 is unreachable for a player in range.
  const groupOf = (player: number): number => groupByPlayer[player] ?? -1;

  const isCollision = (player: number) => prevOf(player) !== null && groupOf(player) === prevOf(player);

  const swap = (a: number, b: number) => {
    const held = groupOf(a);
    groupByPlayer[a] = groupOf(b);
    groupByPlayer[b] = held;
  };

  const collisions = () => range(prevGroupByPlayer.length).filter(isCollision);

  // Pass A: pair collisions off against each other.
  let pending = collisions();
  for (const a of pending) {
    if (!isCollision(a)) continue; // already fixed as someone else's partner
    const partner = pending.find((b) => b !== a && isCollision(b) && groupOf(b) !== groupOf(a));
    if (partner !== undefined) swap(a, partner);
  }

  // Pass B: whatever is left swaps with a player who isn't a collision.
  pending = collisions();
  for (const a of pending) {
    const leaving = groupOf(a);
    const partner = range(prevGroupByPlayer.length).find(
      (b) => b !== a && groupOf(b) !== leaving && prevOf(b) !== leaving && !isCollision(b),
    );
    // No partner exists for this one, so none exists for any of the rest either:
    // they all sit in the same group with the same history. Accept the repeats.
    if (partner === undefined) break;
    swap(a, partner);
  }

  return groupByPlayer;
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}
