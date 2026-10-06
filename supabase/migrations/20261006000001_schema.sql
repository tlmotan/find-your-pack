-- =============================================================================
-- Find Your Pack: data model (ARCHITECTURE.md §4)
--
-- Privacy: no names, emails, or accounts. Players and hosts are identified only
-- by SHA-256 hashes of random tokens made in the browser.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;  -- digest() for SHA-256

-- scheduled = created, not open for joining yet
-- lobby     = players can join and wait
-- started   = groups assigned; late or waking players join the smallest group
-- (Ending a session deletes it, so there is no "ended" status.)
create type public.session_status as enum ('scheduled', 'lobby', 'started');

-- -----------------------------------------------------------------------------
-- sessions: one row per icebreaker run
-- -----------------------------------------------------------------------------
create table public.sessions (
  id                    uuid primary key default gen_random_uuid(),
  join_code             text not null unique
                          check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),     -- no 0/O, 1/I lookalikes
  host_secret_hash      text not null,                                 -- sha256 hex of the host link secret

  -- Which groups can be handed out. Always stored on the session, because
  -- Postgres functions can't read lib/themes.ts. theme_key is just a label.
  theme_key             text,                                          -- e.g. 'animals'; null for custom names
  group_options         jsonb not null
                          check (jsonb_typeof(group_options) = 'array'
                                 and jsonb_array_length(group_options) between 2 and 20),
  group_count_override  int check (group_count_override between 1 and 20),

  reveal_seconds        int not null default 5 check (reveal_seconds between 2 and 30),
  status                public.session_status not null default 'scheduled',

  lobby_opened_at       timestamptz,
  started_at            timestamptz,
  reveal_at             timestamptz,                                   -- started_at + 3 s: same-moment reveal

  created_at            timestamptz not null default now(),
  expires_at            timestamptz not null,

  constraint expires_within_7_days
    check (expires_at > created_at and expires_at <= created_at + interval '7 days'),
  constraint started_has_times
    check (status <> 'started' or (started_at is not null and reveal_at is not null))
);

create index sessions_expires_at_idx on public.sessions (expires_at);   -- for cleanup

-- -----------------------------------------------------------------------------
-- groups: created at Start, never before (anti-cheat rule)
-- -----------------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 30),
  emoji       text,
  sound_hint  text,
  sort_order  int  not null,
  unique (session_id, sort_order)
);

-- -----------------------------------------------------------------------------
-- participants: one row per browser per session. No personal data.
-- -----------------------------------------------------------------------------
create table public.participants (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions (id) on delete cascade,
  device_token_hash  text not null,                     -- sha256 hex of the browser's device token
  group_id           uuid references public.groups (id) on delete cascade,  -- null until assigned
  joined_at          timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(), -- heartbeat; Start assigns only recently active
  assigned_at        timestamptz,                        -- when group_id was set
  revealed_at        timestamptz,                        -- first time the group was returned; set once
  unique (session_id, device_token_hash),
  constraint assigned_has_time check ((group_id is null) = (assigned_at is null))
);

create index participants_group_id_idx on public.participants (group_id);
create index participants_session_seen_idx on public.participants (session_id, last_seen_at);

-- -----------------------------------------------------------------------------
-- Lock-down: RLS on with NO policies, so the anon key can't read or write any
-- table directly. The only way in is the SECURITY DEFINER functions.
-- -----------------------------------------------------------------------------
alter table public.sessions     enable row level security;
alter table public.groups       enable row level security;
alter table public.participants enable row level security;

revoke all on public.sessions, public.groups, public.participants from anon, authenticated;
