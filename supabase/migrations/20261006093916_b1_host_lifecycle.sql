-- =============================================================================
-- B1: host lifecycle — create a session and open its lobby.
--
-- Replaces the scaffold stubs for _require_host, create_session, open_lobby and
-- get_host_state. The earlier migration is left untouched (hard rule 8); these
-- are CREATE OR REPLACE, which keeps the EXECUTE grants already made to anon.
--
-- Still stubs after this migration: _assign_to_smallest_group, update_settings,
-- start_session, end_session, join_session, get_my_state.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- _host_state: the HostState payload (lib/types.ts), built in one place so
-- get_host_state and every host action that returns fresh state agree.
--
-- NEW function — Postgres grants EXECUTE to public by default, so it is revoked
-- below. It takes the session row rather than an id because every caller has
-- already loaded (and often locked) that row; re-reading it could return
-- something different from what they just wrote.
-- -----------------------------------------------------------------------------
create or replace function public._host_state(p_session public.sessions)
returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'status',               p_session.status,
    'join_code',            p_session.join_code,
    'reveal_seconds',       p_session.reveal_seconds,
    'group_count_override', p_session.group_count_override,
    'expires_at',           p_session.expires_at,
    -- "Active" matches ACTIVE_CUTOFF_SECONDS in lib/constants.ts. Start counts
    -- the same way, so the host's number is the number Start will act on.
    'active_count', (
      select count(*)
        from public.participants p
       where p.session_id = p_session.id
         and p.last_seen_at > now() - interval '60 seconds'
    ),
    -- Empty until Start: groups do not exist before then (hard rule 4).
    'group_sizes', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'name',  g.name,
                 'emoji', g.emoji,
                 'size',  (select count(*) from public.participants p where p.group_id = g.id)
               ) order by g.sort_order)
        from public.groups g
       where g.session_id = p_session.id
    ), '[]'::jsonb)
  );
$$;

-- -----------------------------------------------------------------------------
-- _require_host: the single auth check for every host action.
--
-- Three things must hold before any host call proceeds: the session exists, it
-- has not expired, and the secret from the URL fragment hashes to the stored
-- hash. Only the hash is ever stored (hard rule 2), so a database leak cannot
-- be replayed as a host.
-- -----------------------------------------------------------------------------
create or replace function public._require_host(p_session_id uuid, p_host_secret text, p_lock boolean default false)
returns public.sessions
language plpgsql
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  -- FOR UPDATE serialises host actions on one session, so two taps of Start
  -- cannot both pass their checks and assign twice (hard rule 7).
  if p_lock then
    select * into v_session from public.sessions where id = p_session_id for update;
  else
    select * into v_session from public.sessions where id = p_session_id;
  end if;

  -- Expiry is enforced here rather than in each caller, so no host function can
  -- forget it. pg_cron deletes these rows later; this closes the gap until then.
  if not found or v_session.expires_at <= now() then
    raise exception 'session not found or expired' using errcode = 'P0002';
  end if;

  if public._hash_token(p_host_secret) is distinct from v_session.host_secret_hash then
    raise exception 'invalid host secret' using errcode = 'P0003';
  end if;

  return v_session;
end;
$$;

-- -----------------------------------------------------------------------------
-- create_session: makes a 'scheduled' session (PRD H1).
--
-- The raw host secret is returned exactly once, here, and never stored — the
-- host keeps it in their link fragment. Nothing else can ever recover it.
-- -----------------------------------------------------------------------------
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
declare
  -- The join-code alphabet from the schema CHECK: no O/0 or I/1 to misread
  -- across a room. Exactly 32 symbols, which matters for the modulo below.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes    bytea;
  v_code     text;
  v_secret   text;
  v_id       uuid;
  v_attempt  int := 0;
begin
  if p_group_options is null
     or jsonb_typeof(p_group_options) <> 'array'
     or jsonb_array_length(p_group_options) not between 2 and 20 then
    raise exception 'group_options must be an array of 2 to 20 groups';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_group_options) as e
     where coalesce(e->>'name', '') = '' or char_length(e->>'name') > 30
  ) then
    raise exception 'every group needs a name of 1 to 30 characters';
  end if;

  if p_reveal_seconds is null or p_reveal_seconds not between 2 and 30 then
    raise exception 'reveal_seconds must be between 2 and 30';
  end if;

  if p_expires_in_days is null or p_expires_in_days not between 1 and 7 then
    raise exception 'expires_in_days must be between 1 and 7';
  end if;

  -- 256 bits. This is the only thing standing between a stranger and control of
  -- the game, so it comes from the CSPRNG, not random().
  v_secret := encode(extensions.gen_random_bytes(32), 'hex');

  loop
    v_attempt := v_attempt + 1;

    -- Also CSPRNG: a guessable code would let someone join a lobby uninvited.
    -- 256 is divisible by 32, so the modulo keeps every symbol equally likely.
    v_bytes := extensions.gen_random_bytes(6);
    select string_agg(substr(v_alphabet, 1 + (get_byte(v_bytes, g) % 32), 1), '' order by g)
      into v_code
      from generate_series(0, 5) as g;

    begin
      insert into public.sessions (
        join_code, host_secret_hash, theme_key, group_options, reveal_seconds, expires_at
      ) values (
        v_code,
        public._hash_token(v_secret),
        p_theme_key,
        p_group_options,
        p_reveal_seconds,
        now() + make_interval(days => p_expires_in_days)
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      -- A collision across live sessions is vanishingly rare; retry rather than
      -- fail the host, but do not spin forever if something is badly wrong.
      if v_attempt >= 10 then
        raise exception 'could not allocate a unique join code';
      end if;
    end;
  end loop;

  return jsonb_build_object('session_id', v_id, 'join_code', v_code, 'host_secret', v_secret);
end;
$$;

-- -----------------------------------------------------------------------------
-- open_lobby: scheduled -> lobby (PRD H1b).
--
-- Until this runs, join_session refuses and creates no row, so a QR code shared
-- on slides days early cannot quietly fill the lobby (hard rule 8 in the
-- essentials).
-- -----------------------------------------------------------------------------
create or replace function public.open_lobby(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  v_session := public._require_host(p_session_id, p_host_secret, true);

  -- Idempotent: a host tapping twice on a flaky connection gets the state back,
  -- not an error they have to interpret in front of a room.
  if v_session.status = 'lobby' then
    return public._host_state(v_session);
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'lobby cannot be opened once the session is %', v_session.status;
  end if;

  update public.sessions
     set status = 'lobby',
         lobby_opened_at = now()
   where id = p_session_id
  returning * into v_session;

  return public._host_state(v_session);
end;
$$;

-- -----------------------------------------------------------------------------
-- get_host_state: dashboard poll, every 3 s.
-- -----------------------------------------------------------------------------
create or replace function public.get_host_state(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
begin
  return public._host_state(public._require_host(p_session_id, p_host_secret, false));
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissions. CREATE OR REPLACE keeps the grants the scaffold already made,
-- but _host_state is new and Postgres grants EXECUTE on new functions to public
-- by default — it is internal and must not be callable with the anon key.
-- -----------------------------------------------------------------------------
revoke execute on function public._host_state(public.sessions) from public, anon, authenticated;

grant execute on function
  public.create_session(text, jsonb, int, int),
  public.get_host_state(uuid, text),
  public.open_lobby(uuid, text)
to anon;
