// Timing and limits shared by the client. Server-side equivalents live in the
// SQL functions; keep both in sync (ARCHITECTURE.md §5–6).

export const COUNTDOWN_SECONDS = 3;
export const REVEAL_GRACE_SECONDS = 3;
export const ACTIVE_CUTOFF_SECONDS = 60;

export const REVEAL_SECONDS = { min: 2, max: 30, default: 5 } as const;
export const EXPIRES_IN_DAYS = { min: 1, max: 7, default: 7 } as const;
export const GROUP_OPTIONS = { min: 2, max: 20, nameMaxLength: 30 } as const;
export const MAX_DEFAULT_GROUPS = 10;
export const MIN_PER_PACK = 3;
export const MIN_PLAYERS_TO_START = 2;

export const POLL_MS = {
  waiting: 5_000,
  afterReveal: 10_000,
  host: 3_000,
} as const;

export const START_JITTER_MS = 500;
