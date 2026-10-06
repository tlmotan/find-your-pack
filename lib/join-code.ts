// Landing-page helpers for the manual join-code path (PRD P1, "or enter the
// join code"). Pure so the keystroke handling and the error copy are testable
// without a browser; the real joining happens in /join/[code].

import { joinCodeSchema } from "./validation";

export const JOIN_CODE_LENGTH = 6;

/** Characters the code alphabet deliberately omits, because they misread. */
const LOOKALIKES = /[O0I1]/;

/**
 * What a keystroke should leave in the field: uppercase, alphanumeric only,
 * never longer than a code. Lookalikes are kept rather than silently dropped —
 * a character vanishing as you type reads as a broken keyboard, and
 * joinCodeError() can explain the real problem on submit.
 */
export function normalizeJoinCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, JOIN_CODE_LENGTH);
}

/**
 * The message to show under the field, or null when the code is good.
 * Each one names the problem and what to do about it.
 */
export function joinCodeError(code: string): string | null {
  const value = normalizeJoinCode(code);

  if (value.length === 0) {
    return "Enter the 6-character code from the host's screen.";
  }
  // Checked before length: a lookalike is the surprising failure, and saying
  // "6 characters" to someone who typed 6 would be useless.
  if (LOOKALIKES.test(value)) {
    return "Codes never use O, 0, I or 1 — check the host's screen.";
  }
  if (value.length < JOIN_CODE_LENGTH) {
    return "Codes are 6 characters long.";
  }
  if (!joinCodeSchema.safeParse(value).success) {
    return "That code doesn't look right — check the host's screen.";
  }
  return null;
}
