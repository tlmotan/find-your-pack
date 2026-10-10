// Data model types. Mirror supabase/migrations/*_schema.sql (ARCHITECTURE.md §4).
// Raw table rows never reach the browser (tables are locked); these exist for
// clarity and for the RPC response shapes below.

export type SessionStatus = "scheduled" | "lobby" | "started";

export type GroupOption = {
  name: string;
  emoji?: string;
  sound_hint?: string;
};

export type Session = {
  id: string;
  join_code: string;
  host_secret_hash: string;
  theme_key: string | null;
  group_options: GroupOption[];
  group_count_override: number | null;
  reveal_seconds: number;
  status: SessionStatus;
  lobby_opened_at: string | null;
  started_at: string | null;
  reveal_at: string | null;
  created_at: string;
  expires_at: string;
};

export type Group = {
  id: string;
  session_id: string;
  name: string;
  emoji: string | null;
  sound_hint: string | null;
  sort_order: number;
};

export type Participant = {
  id: string;
  session_id: string;
  device_token_hash: string;
  group_id: string | null;
  joined_at: string;
  last_seen_at: string;
  assigned_at: string | null;
  revealed_at: string | null;
};

// ---------------------------------------------------------------------------
// RPC responses
// ---------------------------------------------------------------------------

export type CreateSessionResult = {
  session_id: string;
  join_code: string;
  host_secret: string; // shown once, inside the host link fragment
};

export type JoinResult =
  | { status: "joined"; session_id: string }
  | { status: "not_open" }
  | { status: "ended" };

/** What get_my_state returns. Drives the player screen (ARCHITECTURE.md §5.3). */
export type MyState =
  | { status: "not_open" }
  | { status: "waiting"; server_now: string }
  | {
      status: "reveal";
      group: Pick<Group, "name" | "emoji" | "sound_hint">;
      pack_size: number;
      my_reveal_at: string;
      reveal_seconds: number;
      /** Which round this is (e1 migration). A new round re-stamps my_reveal_at,
       *  which is what makes the phone count down and reveal again — so nothing
       *  on the player side needs to read this; it is here to be asserted in
       *  tests and read in the console. Optional for the same reason as
       *  HostState.round: a client deployed ahead of the migration won't get it. */
      round?: number;
      server_now: string;
    }
  | { status: "hidden"; pack_size: number; round?: number }
  /** The server has no participant row for this device (d2 migration). Not the
   *  same as "ended": the game may well still be running. */
  | { status: "not_joined" }
  | { status: "ended" };

export type HostState = {
  status: SessionStatus;
  join_code: string;
  reveal_seconds: number;
  group_count_override: number | null;
  expires_at: string;
  active_count: number;
  group_sizes: { name: string; emoji: string | null; size: number }[]; // empty before Start
  /** 0 until Start, then 1 and up — one per round the host has run (e1 migration).
   *  Optional for the same reason as can_start_next_round: a client deployed
   *  ahead of the migration must render something sane without it. */
  round?: number;
  /** The server's own answer to "would start_next_round succeed right now?".
   *  Computed in _host_state rather than from reveal_at, because the host page
   *  has no clock offset and a fast laptop would light the button up mid-reveal.
   *  Optional so a client deployed ahead of the migration simply never enables
   *  the button. */
  can_start_next_round?: boolean;
};

/** Player screen states (ARCHITECTURE.md §8). */
export type PlayerScreen =
  | "joining"
  | "not_open"
  | "waiting"
  | "countdown"
  | "revealed"
  | "hidden"
  /** We lost this phone's spot; the only way back in is the QR code. */
  | "lost_spot"
  | "ended";
