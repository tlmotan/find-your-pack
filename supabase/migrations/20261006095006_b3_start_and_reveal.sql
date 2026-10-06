-- =============================================================================
-- B3: Start, assignment, and the reveal window.
--
-- Replaces _assign_to_smallest_group, start_session and get_my_state. The
-- assignment rules mirror lib/assignment.ts exactly — that file exists so the
-- same maths can be unit-tested quickly, but THIS is the one that runs.
--
-- Timing constants are repeated from lib/constants.ts because Postgres cannot
-- read TypeScript: COUNTDOWN_SECONDS = 3, REVEAL_GRACE_SECONDS = 3,
-- ACTIVE_CUTOFF_SECONDS = 60, MIN_PLAYERS_TO_START = 2, MIN_PER_PACK = 3,
-- MAX_DEFAULT_GROUPS = 10. Change one, change both.
--
-- Still stubs after this migration: update_settings, end_session.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- _assign_to_smallest_group: for a player who arrived late or whose phone was
-- asleep at Start (ARCHITECTURE.md §5.2).
--
-- The caller must already hold the session row lock, otherwise two phones
-- waking at the same instant both read "group A is smallest" and both land
-- there, quietly breaking the ±1 balance.
-- -----------------------------------------------------------------------------
create or replace function public._assign_to_smallest_group(p_participant_id uuid, p_session_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  -- Ties go to the lowest sort_order, matching pickSmallestGroup()'s strict `<`
  -- in lib/assignment.ts, so both implementations pick the same group.
  select g.id
    into v_group_id
    from public.groups g
    left join public.participants p on p.group_id = g.id
   where g.session_id = p_session_id
   group by g.id, g.sort_order
   order by count(p.id) asc, g.sort_order asc
   limit 1;

  if v_group_id is null then
    raise exception 'no groups exist for this session';
  end if;

  update public.participants
     set group_id = v_group_id,
         assigned_at = now()
   where id = p_participant_id;

  return v_group_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- start_session: create the groups and deal everyone into them (PRD H5).
--
-- This is the only moment groups come into existence (hard rule 4). Before it,
-- there is genuinely nothing in the database to leak.
-- -----------------------------------------------------------------------------
create or replace function public.start_session(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_session      public.sessions;
  v_active_count int;
  v_option_count int;
  v_group_count  int;
begin
  -- Locked: two taps of Start must not both get past the checks below and
  -- assign twice (hard rule 7).
  v_session := public._require_host(p_session_id, p_host_secret, true);

  -- Idempotent, like open_lobby. A second tap returning the current state is
  -- far better than re-running assignment and shuffling everyone's group.
  if v_session.status = 'started' then
    return public._host_state(v_session);
  end if;

  if v_session.status <> 'lobby' then
    raise exception 'the lobby must be open before starting (session is %)', v_session.status;
  end if;

  -- ACTIVE_CUTOFF_SECONDS. A phone that has not checked in for a minute is
  -- probably a closed tab; counting it would inflate a pack that nobody fills.
  select count(*) into v_active_count
    from public.participants
   where session_id = p_session_id
     and last_seen_at > now() - interval '60 seconds';

  -- MIN_PLAYERS_TO_START
  if v_active_count < 2 then
    raise exception 'at least 2 active players are needed to start (found %)', v_active_count;
  end if;

  v_option_count := jsonb_array_length(v_session.group_options);

  if v_session.group_count_override is not null then
    -- The host's deliberate choice may exceed the default cap of 10, but never
    -- the number of names available to hand out.
    v_group_count := least(greatest(v_session.group_count_override, 1), v_option_count);
  else
    -- floor(N / MIN_PER_PACK), clamped to [1, min(MAX_DEFAULT_GROUPS, options)].
    -- Integer division already floors. Aiming at 3 per pack keeps a pack
    -- findable in a noisy room; capping at 10 keeps the sounds distinguishable.
    v_group_count := least(greatest(v_active_count / 3, 1), least(10, v_option_count));
  end if;

  insert into public.groups (session_id, name, emoji, sound_hint, sort_order)
  select p_session_id, e->>'name', e->>'emoji', e->>'sound_hint', (ord - 1)::int
    from jsonb_array_elements(v_session.group_options) with ordinality as t(e, ord)
   where ord <= v_group_count;

  -- Shuffle, then deal round-robin. Dealing in a cycle is what keeps sizes
  -- within ±1; shuffling first is what stops packs tracking join order, so
  -- friends who scanned together do not all land together.
  with shuffled as (
    select id, (row_number() over (order by random()) - 1) as pos
      from public.participants
     where session_id = p_session_id
       and last_seen_at > now() - interval '60 seconds'
  )
  update public.participants p
     set group_id = g.id,
         assigned_at = now()
    from shuffled s
    join public.groups g
      on g.session_id = p_session_id
     and g.sort_order = (s.pos % v_group_count)
   where p.id = s.id;

  -- Inactive rows are deliberately left unassigned. If they are real people
  -- whose phones were asleep, get_my_state assigns them the moment they wake.

  update public.sessions
     set status = 'started',
         started_at = now(),
         -- COUNTDOWN_SECONDS: every phone counts down to this same instant, so
         -- they reveal together however staggered the broadcast was.
         reveal_at = now() + interval '3 seconds'
   where id = p_session_id
  returning * into v_session;

  return public._host_state(v_session);
end;
$$;

-- -----------------------------------------------------------------------------
-- get_my_state: heartbeat, late assignment, and the reveal window.
--
-- Replaces the B2 version, which raised on 'started'. The hiding rule lives
-- here and nowhere else: after window_end the group is simply not in the
-- response, so no client bug, refresh, or devtools poke can bring it back
-- (hard rule 5).
-- -----------------------------------------------------------------------------
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

  -- No row means this device never joined. It must not be able to create one
  -- here — join_session owns that, and with it the Open-lobby gate.
  if not found then
    return jsonb_build_object('status', 'ended');
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
