-- =============================================================================
-- Find Your Pack: RPC functions (ARCHITECTURE.md §5)
--
-- Every public function:
--   * is SECURITY DEFINER with a fixed search_path (so callers can't hijack it)
--   * hashes any token it receives before comparing
--   * rejects missing or expired sessions
--   * runs as one transaction (a function call is one statement)
--
-- SCAFFOLD: bodies marked TODO raise 'not implemented'. Build them one at a time,
-- each with a test in supabase/tests/database/.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helpers (not granted to anon)
-- -----------------------------------------------------------------------------

-- SHA-256 hex of a token. We store only hashes, so a database leak can't be
-- used to impersonate a player or host.
create or replace function public._hash_token(p_token text)
returns text
language sql immutable strict
set search_path = public, extensions
as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Load a live session and check the host secret. Locks the row when asked,
-- so two host actions can't run at the same time.
create or replace function public._require_host(p_session_id uuid, p_host_secret text, p_lock boolean default false)
returns public.sessions
language plpgsql
set search_path = public
as $$
begin
  -- TODO: select session (FOR UPDATE if p_lock), raise if missing/expired,
  --       raise if _hash_token(p_host_secret) <> host_secret_hash
  raise exception 'not implemented: _require_host';
end;
$$;

-- Assign one participant to the group with the fewest members (ARCHITECTURE.md §5.2).
-- Caller must already hold the session row lock.
create or replace function public._assign_to_smallest_group(p_participant_id uuid, p_session_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
begin
  -- TODO: pick group with min count (ties -> lowest sort_order), set group_id + assigned_at
  raise exception 'not implemented: _assign_to_smallest_group';
end;
$$;

-- -----------------------------------------------------------------------------
-- Host functions
-- -----------------------------------------------------------------------------

-- Creates a 'scheduled' session. Returns { session_id, join_code, host_secret }.
-- The raw host secret is returned once and never stored.
create or replace function public.create_session(
  p_theme_key text,
  p_group_options jsonb,
  p_reveal_seconds int,
  p_expires_in_days int
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  -- TODO: validate inputs, generate unique join_code + random host secret,
  --       insert with expires_at = now() + p_expires_in_days days (1–7)
  raise exception 'not implemented: create_session';
end;
$$;

-- Returns { status, settings, active_count, group_sizes[] }. Host polls every 3 s.
create or replace function public.get_host_state(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
begin
  raise exception 'not implemented: get_host_state';
end;
$$;

-- Before Start only. Expiry is counted from created_at and capped at 7 days.
create or replace function public.update_settings(
  p_session_id uuid,
  p_host_secret text,
  p_reveal_seconds int default null,
  p_group_count_override int default null,
  p_expires_in_days int default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'not implemented: update_settings';
end;
$$;

-- scheduled -> lobby
create or replace function public.open_lobby(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'not implemented: open_lobby';
end;
$$;

-- Requires 'lobby' and >= 2 active players (last_seen_at within 60 s).
-- Creates groups, assigns balanced (sizes within ±1), sets reveal_at = now() + 3 s.
create or replace function public.start_session(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  -- TODO: see ARCHITECTURE.md §5.1 pseudocode
  raise exception 'not implemented: start_session';
end;
$$;

-- Deletes the session (cascades to groups and participants).
create or replace function public.end_session(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'not implemented: end_session';
end;
$$;

-- -----------------------------------------------------------------------------
-- Player functions
-- -----------------------------------------------------------------------------

-- Returns { status: 'not_open' | 'ended' } or { status: 'joined', session_id }.
-- Creates no row while 'scheduled', so early scans aren't counted.
create or replace function public.join_session(p_join_code text, p_device_token text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'not implemented: join_session';
end;
$$;

-- Heartbeat + state. Assigns the caller if started and unassigned.
-- Enforces the reveal window (ARCHITECTURE.md §5.3).
-- Returns not_open | waiting | reveal | hidden | ended (see lib/types.ts MyState).
create or replace function public.get_my_state(p_session_id uuid, p_device_token text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  raise exception 'not implemented: get_my_state';
end;
$$;

-- Trivial query for the daily keep-alive cron (stops the free project pausing).
create or replace function public.keepalive()
returns int
language sql security definer stable
set search_path = public
as $$ select 1; $$;

-- -----------------------------------------------------------------------------
-- Permissions: only the public RPC functions are callable with the anon key.
-- NOTE: Supabase grants EXECUTE on new functions to anon by default. Any
-- function added in a later migration must repeat this revoke/grant pattern.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.create_session(text, jsonb, int, int),
  public.get_host_state(uuid, text),
  public.update_settings(uuid, text, int, int, int),
  public.open_lobby(uuid, text),
  public.start_session(uuid, text),
  public.end_session(uuid, text),
  public.join_session(text, text),
  public.get_my_state(uuid, text),
  public.keepalive()
to anon;
