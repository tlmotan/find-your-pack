// Which signal flag a pack flies (see the direction contract in app/layout.tsx).
//
// Maritime flags carry identity in TWO channels at once — colour and shape — so
// two packs are never confusable in a dim room, and a colour-blind player is
// never disadvantaged. That is why this replaced a colour-only scheme.
//
// Every design below is a real International Code of Signals flag, chosen under
// two rules:
//
// 1. No flag places red directly against blue. Those two sit at 1.36:1 against
//    each other, which is why the real system always separates them.
// 2. No flag has a white ground. The whole reason this app sits on deep navy is
//    that a bright full-screen field is a flashbulb in a dim hall - and a white
//    flag filling a phone is exactly that. White appears only as a mark on a
//    saturated ground, or as half of one flag.

/** The twelve flags, ordered as they are dealt. Each is drawn in SignalFlag.tsx. */
export const PACK_FLAGS = [
  { id: "bravo", letter: "B", description: "solid red", colors: ["red"], whiteGround: false },
  { id: "quebec", letter: "Q", description: "solid yellow", colors: ["yellow"], whiteGround: false },
  { id: "lima", letter: "L", description: "yellow and black quarters", colors: ["yellow", "black"], whiteGround: false },
  { id: "oscar", letter: "O", description: "red and yellow diagonal", colors: ["red", "yellow"], whiteGround: false },
  { id: "delta", letter: "D", description: "yellow, blue, yellow bands", colors: ["yellow", "blue"], whiteGround: false },
  { id: "kilo", letter: "K", description: "yellow and blue halves", colors: ["yellow", "blue"], whiteGround: false },
  { id: "golf", letter: "G", description: "yellow and blue stripes", colors: ["yellow", "blue"], whiteGround: false },
  { id: "papa", letter: "P", description: "white rectangle on blue", colors: ["blue", "white"], whiteGround: false },
  { id: "mike", letter: "M", description: "white saltire on blue", colors: ["blue", "white"], whiteGround: false },
  { id: "romeo", letter: "R", description: "yellow cross on red", colors: ["red", "yellow"], whiteGround: false },
  { id: "yankee", letter: "Y", description: "yellow and red diagonal stripes", colors: ["yellow", "red"], whiteGround: false },
  { id: "hotel", letter: "H", description: "white and red halves", colors: ["white", "red"], whiteGround: false },
] as const;

export type PackFlag = (typeof PACK_FLAGS)[number];
export type PackFlagId = PackFlag["id"];

export const PACK_FLAG_COUNT = PACK_FLAGS.length;

/**
 * Maps a group name to one of the flags, 0-indexed.
 *
 * Hashed from the name rather than taken from a position because get_my_state
 * returns no group index — there is nothing to count from. Deterministic is the
 * property that matters: every phone in a pack flies the same flag, and a
 * refresh mid-reveal keeps it. Two names can collide; that costs little here
 * because the group's own name is always shown beside the flag.
 */
export function packFlagIndex(groupName: string): number {
  const key = groupName.trim().toLowerCase();

  // djb2. Tiny, and well spread over the short strings group names actually are.
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash * 33) ^ key.charCodeAt(i)) >>> 0;
  }

  return hash % PACK_FLAG_COUNT;
}

export function packFlag(groupName: string): PackFlag {
  const flag = PACK_FLAGS[packFlagIndex(groupName)];
  // The modulo above cannot leave the array, but the index signature says it can.
  if (!flag) throw new Error("packFlag: index out of range");
  return flag;
}
