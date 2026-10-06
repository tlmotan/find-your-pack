-- =============================================================================
-- B2: player entry — join a lobby, and the pre-reveal states.
--
-- Replaces the scaffold stubs for join_session and get_my_state. get_my_state
-- covers not_open / waiting / ended here; the 'started' branch (assignment and
-- the reveal window, ARCHITECTURE.md §5.2–5.3) lands in B3 and still raises.
--
-- Still stubs after this migration: _assign_to_smallest_group, update_settings,
-- start_session, end_session.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- join_session: the QR-code landing (PRD P1).
--
-- Returns 'not_open' and creates NOTHING while the session is scheduled. That
-- is the whole point of Open lobby: a QR code put on slides days early must not
-- quietly fill the lobby with people who then count toward Start.
-- -----------------------------------------------------------------------------
create or replace function public.join_session(p_join_code text, p_device_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_session public.sessions;
  v_code    text;
begin
  if coalesce(p_device_token, '') = '' then
    raise exception 'device token required';
  end if;

  -- Typed codes arrive in any case; the stored code is always upper.
  v_code := upper(coalesce(p_join_code, ''));
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    return jsonb_build_object('status', 'ended');
  end if;

  select * into v_session from public.sessions where join_code = v_code;

  -- Ending a session deletes the row, so "missing" and "ended" are the same
  -- thing to a phone. Expired sessions read the same way until cron sweeps them.
  if not found or v_session.expires_at <= now() then
    return jsonb_build_object('status', 'ended');
  end if;

  if v_session.status = 'scheduled' then
    return jsonb_build_object('status', 'not_open');
  end if;

  -- Only the hash is stored, so a database leak cannot be replayed as a player
  -- (hard rule 2). Upsert, because a refresh or a second scan is the same phone.
  insert into public.participants (session_id, device_token_hash)
  values (v_session.id, public._hash_token(p_device_token))
  on conflict (session_id, device_token_hash)
    do update set last_seen_at = now();

  return jsonb_build_object('status', 'joined', 'session_id', v_session.id);
end;
$$;

-- -----------------------------------------------------------------------------
-- get_my_state: heartbeat + what to show (ARCHITECTURE.md §5.3).
--
-- Every phone calls this on a timer and after every broadcast, so it is the
-- busiest function in the app and the one that decides what a player may see.
-- It is NOT stable: the heartbeat write is the point — last_seen_at is what
-- Start uses to tell a real waiting phone from a ghost.
-- -----------------------------------------------------------------------------
create or replace function public.get_my_state(p_session_id uuid, p_device_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_session public.sessions;
  v_hash    text;
  v_found   boolean;
begin
  if coalesce(p_device_token, '') = '' then
    raise exception 'device token required';
  end if;

  select * into v_session from public.sessions where id = p_session_id;

  if not found or v_session.expires_at <= now() then
    return jsonb_build_object('status', 'ended');
  end if;

  -- Before Open lobby no participant row can exist, so there is nothing to
  -- beat and nothing to tell the caller but "not yet".
  if v_session.status = 'scheduled' then
    return jsonb_build_object('status', 'not_open');
  end if;

  v_hash := public._hash_token(p_device_token);

  -- The heartbeat happens before any state is computed, so a phone that is
  -- polling is always counted as active by a Start running concurrently.
  update public.participants
     set last_seen_at = now()
   where session_id = p_session_id
     and device_token_hash = v_hash;

  get diagnostics v_found = row_count;

  -- No row means this device never joined this session (or the session was
  -- rebuilt). There is nothing to show it, and it must not be able to create a
  -- row here — join_session owns that, and with it the not_open gate.
  if v_found = false then
    return jsonb_build_object('status', 'ended');
  end if;

  if v_session.status = 'lobby' then
    -- server_now anchors the phone's clock offset (lib/server-clock.ts), so it
    -- is sent from the waiting screen onward, not only at reveal.
    return jsonb_build_object('status', 'waiting', 'server_now', now());
  end if;

  -- status = 'started': assignment and the reveal window. B3.
  raise exception 'not implemented: get_my_state (started)';
end;
$$;
