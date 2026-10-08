-- =============================================================================
-- D2: tell "we cannot find your phone" apart from "the game is over".
--
-- get_my_state answered 'ended' for both, so a phone whose participant row was
-- missing — a browser that lost its device token, or one that reached /play
-- without going through /join — was told the host had ended a game that was
-- still running. The phone then stopped polling, and only a refresh cleared it.
--
-- 'not_joined' is the one behaviour change: every other branch is byte-for-byte
-- the B3 function. 'ended' now means only what it says — the session row is gone
-- or expired. join_session is untouched: it already cannot tell a deleted
-- session from a mistyped code, because the row it would check is the one that
-- was deleted.
--
-- Clients: lib/types.ts MyState, lib/poll.ts (re-joins and re-checks while
-- not_joined, stops dead on ended), lib/player-screen.ts (the "scan the QR
-- again" screen).
-- =============================================================================

create or replace function public.get_my_state(p_session_id uuid, p_device_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_session      public.sessions;
  v_part         public.participants;
  v_group        public.groups;
  v_hash         text;
  v_my_reveal_at timestamptz;
  v_revealed_at  timestamptz;
  v_window_end   timestamptz;
  v_pack_size    int;
begin
  if coalesce(p_device_token, '') = '' then
    raise exception 'device token required';
  end if;

  select * into v_session from public.sessions where id = p_session_id;

  if not found or v_session.expires_at <= now() then
    return jsonb_build_object('status', 'ended');
  end if;

  if v_session.status = 'scheduled' then
    return jsonb_build_object('status', 'not_open');
  end if;

  v_hash := public._hash_token(p_device_token);

  -- Heartbeat first, so a phone that is polling is always counted as active by
  -- a Start running at the same moment.
  update public.participants
     set last_seen_at = now()
   where session_id = p_session_id
     and device_token_hash = v_hash
  returning * into v_part;

  -- No row means this device never joined, or lost the token it joined with.
  -- It must not be able to create one here — join_session owns that, and with
  -- it the Open-lobby gate — so the only thing to do is say so plainly and let
  -- the phone re-join or the player re-scan. This used to answer 'ended', which
  -- told people the host had finished a game that was still running.
  if not found then
    return jsonb_build_object('status', 'not_joined');
  end if;

  if v_session.status = 'lobby' then
    return jsonb_build_object('status', 'waiting', 'server_now', now());
  end if;

  -- ---- status = 'started' ----------------------------------------------------

  -- Late arrival, or a phone that was asleep when Start ran.
  if v_part.group_id is null then
    -- Lock the session so two phones waking together cannot both read the same
    -- group as smallest (ARCHITECTURE.md §5.2).
    perform 1 from public.sessions where id = p_session_id for update;

    -- Re-read under the lock: another call may have assigned us while we waited.
    select * into v_part from public.participants where id = v_part.id;

    if v_part.group_id is null then
      perform public._assign_to_smallest_group(v_part.id, p_session_id);
      select * into v_part from public.participants where id = v_part.id;
    end if;
  end if;

  select * into v_group from public.groups where id = v_part.group_id;

  -- A late player counts down from their own assignment, not from Start, so
  -- they still get a countdown rather than an instant reveal.
  v_my_reveal_at := greatest(v_session.reveal_at, v_part.assigned_at + interval '3 seconds');

  if v_part.revealed_at is null then
    -- The window starts the first time the group is actually handed over, not
    -- at Start. This is what gives a phone unlocked ten minutes late its full
    -- reveal instead of an empty screen (PRD P7).
    update public.participants
       set revealed_at = now()
     where id = v_part.id
    returning revealed_at into v_revealed_at;
  else
    v_revealed_at := v_part.revealed_at;
  end if;

  -- REVEAL_GRACE_SECONDS of slack past the nominal window, so a phone on a slow
  -- connection is not cut off mid-reveal. The client hides earlier than this.
  v_window_end := greatest(v_my_reveal_at, v_revealed_at)
                  + make_interval(secs => v_session.reveal_seconds + 3);

  select count(*) into v_pack_size
    from public.participants
   where group_id = v_part.group_id;

  if now() >= v_window_end then
    -- Past the window: the group is not in this response at all.
    return jsonb_build_object('status', 'hidden', 'pack_size', v_pack_size);
  end if;

  return jsonb_build_object(
    'status', 'reveal',
    'group', jsonb_build_object(
      'name', v_group.name, 'emoji', v_group.emoji, 'sound_hint', v_group.sound_hint
    ),
    'pack_size', v_pack_size,
    'my_reveal_at', v_my_reveal_at,
    'reveal_seconds', v_session.reveal_seconds,
    'server_now', now()
  );
end;
$$;
