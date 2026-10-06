-- =============================================================================
-- C1: the last two host functions — adjust settings, and end the game.
--
-- Replaces the final scaffold stubs. After this migration no function in the
-- schema raises 'not implemented'.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- update_settings: change the reveal timer, group count or session length
-- before Start (PRD H3).
--
-- Each parameter is null for "leave this alone", which is how lib/rpc.ts calls
-- it. That means an existing group_count_override cannot be cleared back to
-- automatic through this function; nothing in v1 offers that, and a sentinel
-- value would be complexity with no caller.
-- -----------------------------------------------------------------------------
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
declare
  v_session     public.sessions;
  v_option_count int;
  v_new_expiry  timestamptz;
begin
  -- Locked: settings must not change underneath a Start that is already
  -- running its checks (hard rule 7).
  v_session := public._require_host(p_session_id, p_host_secret, true);

  -- Once groups exist, reveal_seconds is already baked into windows that phones
  -- are counting down to, and the group count cannot change at all.
  if v_session.status = 'started' then
    raise exception 'settings cannot be changed once the game has started';
  end if;

  if p_reveal_seconds is not null and p_reveal_seconds not between 2 and 30 then
    raise exception 'reveal_seconds must be between 2 and 30';
  end if;

  if p_group_count_override is not null then
    v_option_count := jsonb_array_length(v_session.group_options);
    if p_group_count_override < 1 or p_group_count_override > v_option_count then
      raise exception 'group count must be between 1 and % (the number of group names)', v_option_count;
    end if;
  end if;

  if p_expires_in_days is not null then
    if p_expires_in_days not between 1 and 7 then
      raise exception 'expires_in_days must be between 1 and 7';
    end if;

    -- Counted from created_at, not from now, so repeatedly saving settings
    -- cannot walk a session's life past the 7-day cap the CHECK enforces.
    v_new_expiry := v_session.created_at + make_interval(days => p_expires_in_days);

    -- A session created three days ago, set to "1 day", would expire the moment
    -- it was saved. Refuse rather than let a host delete their own game by
    -- adjusting a dropdown.
    if v_new_expiry <= now() then
      raise exception 'that would expire the session immediately';
    end if;
  end if;

  update public.sessions
     set reveal_seconds       = coalesce(p_reveal_seconds, reveal_seconds),
         group_count_override = coalesce(p_group_count_override, group_count_override),
         expires_at           = coalesce(v_new_expiry, expires_at)
   where id = p_session_id
  returning * into v_session;

  return public._host_state(v_session);
end;
$$;

-- -----------------------------------------------------------------------------
-- end_session: delete the game (PRD H7).
--
-- A hard delete, not a status flag. Nothing is kept once a game is over, which
-- is the cheapest possible answer to "what data do you hold?" — none. Groups
-- and participants go with it through ON DELETE CASCADE.
--
-- The host page broadcasts 'ended' BEFORE calling this (ARCHITECTURE.md §6.1);
-- once the row is gone there is nothing left to broadcast from, and phones that
-- miss the event find out on their next get_my_state.
-- -----------------------------------------------------------------------------
create or replace function public.end_session(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  v_session := public._require_host(p_session_id, p_host_secret, true);

  delete from public.sessions where id = v_session.id;

  return jsonb_build_object('ok', true);
end;
$$;
