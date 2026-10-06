// Picks the full-bleed reveal background for a group (DESIGN.md section 2).
//
// Why hash the name instead of using the group's position: get_my_state
// deliberately returns only { name, emoji, sound_hint }, with no index, so the
// client has nothing to count from. Hashing the name is deterministic, which is
// the property that actually matters here — every phone in the Cow pack lands on
// the same colour, and a refresh mid-reveal keeps it. Two different names can
// collide on one colour; that is acceptable because colour never carries group
// identity (the name and emoji do), so a collision costs nothing.

/** Number of reveal colours defined as --color-pack-N in app/globals.css. */
export const PACK_COLOR_COUNT = 12;

/**
 * Maps a group name to a reveal colour index in 1..PACK_COLOR_COUNT.
 * Case- and whitespace-insensitive, so a host typing "cow" and "Cow " agree.
 */
export function packColorIndex(groupName: string): number {
  const key = groupName.trim().toLowerCase();

  // djb2. Chosen for being tiny and well-spread over short strings; the >>> 0
  // keeps it an unsigned 32-bit value so the modulo below can't go negative.
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash * 33) ^ key.charCodeAt(i)) >>> 0;
  }

  return (hash % PACK_COLOR_COUNT) + 1;
}

/** The CSS custom property holding that colour, for an inline background. */
export function packColorVar(groupName: string): string {
  return `var(--color-pack-${packColorIndex(groupName)})`;
}
