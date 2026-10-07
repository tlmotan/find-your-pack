// Timing and limits shared by the client. Server-side equivalents live in the
// SQL functions; keep both in sync (ARCHITECTURE.md §5–6).

export const COUNTDOWN_SECONDS = 3;
export const REVEAL_GRACE_SECONDS = 3;
export const ACTIVE_CUTOFF_SECONDS = 60;

export const REVEAL_SECONDS = { min: 2, max: 30, default: 5 } as const;
export const EXPIRES_IN_DAYS = { min: 1, max: 7, default: 7 } as const;
export const GROUP_OPTIONS = { min: 2, max: 20, nameMaxLength: 30 } as const;
/** Post-game feedback. Mirrored by the CHECK constraints in the d1 migration. */
export const FEEDBACK = { commentMaxLength: 300, maxReasons: 10 } as const;
export const MAX_DEFAULT_GROUPS = 10;
export const MIN_PER_PACK = 3;
export const MIN_PLAYERS_TO_START = 2;

/** No request may outlive this. Double the waiting poll, so a slow reply still
 *  lands before the next one is due. */
export const RPC_TIMEOUT_MS = 10_000;

/** Consecutive failed polls before a player is told anything. One dropped
 *  request on venue wifi is normal and not worth mentioning. */
export const OFFLINE_AFTER_FAILURES = 2;

export const POLL_MS = {
  waiting: 5_000,
  afterReveal: 10_000,
  host: 3_000,
  /** Waiting at the door for the lobby to open. Slow on purpose: the broadcast
   *  is the fast path and this only covers a dropped websocket. */
  notOpen: 10_000,
} as const;

/** Spread over the reveal fetch. Tight, because every phone must reveal
 *  together. */
export const START_JITTER_MS = 500;

/** Spread over the join when the lobby opens. Deliberately wider than
 *  START_JITTER_MS: nothing about joining has to be simultaneous, and
 *  join_session is a write, so smearing a 150-phone burst across two seconds
 *  instead of half a second costs nobody anything. */
export const JOIN_JITTER_MS = 2_000;
