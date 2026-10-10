-- =============================================================================
-- E1: Multiple rounds in one game (PRD H10, A6).
--
-- One round was never enough time at a real service. The host can now press
-- "Start round N" as often as they like and ends the game when they choose, so
-- End stays the only terminal, data-deleting act (PRD H7).
--
-- Shape of the change:
--   * sessions.round            which round is running (0 = not started yet)
--   * participants.prev_group_id the pack this phone had in the round before
--   * _deal_round               the deal, shared by round 1 and every round after
--   * start_next_round          the new host action
--
-- The `groups` rows are created once, at Start, and reused every round: only
-- who is in each pack changes. That keeps hard rule 4 intact (no groups before
-- Start) and avoids the two traps in the schema — `groups unique (session_id,
-- sort_order)` would reject a second set, and `participants.group_id`'s
-- ON DELETE CASCADE means deleting a group row deletes the *player*.
--
-- Timing constants are repeated from lib/constants.ts because Postgres cannot
-- read TypeScript: COUNTDOWN_SECONDS = 3, REVEAL_GRACE_SECONDS = 3,
-- ACTIVE_CUTOFF_SECONDS = 60, MIN_PLAYERS_TO_START = 2. Change one, change both.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Schema
-- -----------------------------------------------------------------------------

-- 0 while the session is 'scheduled' or 'lobby'; Start sets 1; each new round
-- adds 1. Phones read it only to tell one round from the next.
alter table public.sessions
  add column if not exists round int not null default 0;

alter table public.sessions
  drop constraint if exists started_has_round;
alter table public.sessions
  add constraint started_has_round check (status <> 'started' or round >= 1);

-- The pack this phone had in the previous round, so "never the same animal
-- twice in a row" can be checked in one place.
--
-- ON DELETE SET NULL, deliberately NOT cascade: group_id cascades, which is why
-- deleting a group row deletes the player. This column must never inherit that.
alter table public.participants
  add column if not exists prev_group_id uuid
    references public.groups (id) on delete set null;

-- -----------------------------------------------------------------------------
-- _deal_round: shuffle the active players into the existing groups.
--
-- Lifted out of start_session so round 1 and round 7 run the same code.
--
-- The caller must already hold the session row lock (hard rule 7). Without it
-- two concurrent Starts would both deal, and the swap passes below would read
-- half of each other's work.
--
-- p_avoid_previous is the round-2-onwards rule: nobody keeps the pack they just
-- had (PRD A6). Two ways to do that were considered:
--
--   * Rotate whole packs (new = old + 1). Guarantees a change, but moves every
--     pack intact — the same people find each other again, which is precisely
--     the game. Rejected.
--   * Deal at random, then repair. A random deal is what keeps sizes within ±1
--     (PRD A2) and genuinely mixes the room, but leaves roughly N/G players on
--     the animal they had. So we fix those by swapping, and a swap of two
--     group_ids cannot change any pack's size. Chosen.
--
-- Two packs is handled on its own, before any of that, because with two packs
-- the answer is forced: everyone crosses to the other side. There is no other
-- arrangement, so there is nothing to shuffle or repair. It is also the one case
-- the repair below cannot always finish — see Pass B.
--
-- For three packs or more, the repair runs in two passes. Call a player whose
-- new pack equals their old one a "collision".
--
--   Pass A: pair two collisions in different packs. Each takes the other's
--           pack, so each ends up somewhere that is not their old one, and both
--           are fixed by one swap.
--   Pass B: after Pass A every remaining collision sits in the *same* pack — if
--           two had sat in different packs, Pass A would have paired them. So
--           they all need an outside partner: any non-colliding player in
--           another pack whose own previous pack is not the one we are leaving.
--
--           Such a partner always exists once there are three packs. It could
--           only be missing if *every* player outside pack X had come from X,
--           and with balanced sizes that needs N(G-1)/G players to have come
--           from a pack of about N/G — impossible unless G <= 2, which is
--           exactly why two packs is special-cased above.
--
-- Anything still colliding after both passes is accepted rather than raised.
-- Failing a round start in front of 120 people is far worse than one player
-- repeating an animal.
-- -----------------------------------------------------------------------------
create or replace function public._deal_round(
  p_session_id     uuid,
  p_group_count    int,
  p_avoid_previous boolean
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_a_id    uuid;
  v_a_group uuid;
  v_b_id    uuid;
  v_b_group uuid;
  -- Both passes provably shrink the collision count every iteration, so this is
  -- insurance against a future edit, not against the logic as written. A live
  -- game must never hang on a round start.
  v_guard   int := 0;
  v_limit   int;
begin
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
     and g.sort_order = (s.pos % p_group_count)
   where p.id = s.id;

  if not p_avoid_previous then
    return;
  end if;

  -- Two packs: everyone simply crosses over. Sizes stay within ±1 because the
  -- previous two sizes were, and this only exchanges them.
  if p_group_count = 2 then
    update public.participants p
       set group_id = other.id
      from public.groups mine,
           public.groups other
     where p.session_id = p_session_id
       -- group_id is not null restricts this to the players the deal above just
       -- placed, i.e. the active ones.
       and p.group_id is not null
       and p.prev_group_id = mine.id
       and other.session_id = p_session_id
       and other.sort_order = 1 - mine.sort_order;

    -- A phone with no previous pack (it joined after the last round was dealt)
    -- has nothing to avoid, so it just fills whichever side is smaller. Cleared
    -- first so it is not counted against itself.
    update public.participants
       set group_id = null,
           assigned_at = null
     where session_id = p_session_id
       and group_id is not null
       and prev_group_id is null;

    for v_a_id in
      select id
        from public.participants
       where session_id = p_session_id
         and group_id is null
         and prev_group_id is null
         and last_seen_at > now() - interval '60 seconds'
       order by random()
    loop
      perform public._assign_to_smallest_group(v_a_id, p_session_id);
    end loop;

    return;
  end if;

  select count(*) into v_limit from public.participants where session_id = p_session_id;

  -- Pass A: two collisions in different packs fix each other.
  loop
    v_guard := v_guard + 1;
    exit when v_guard > v_limit;

    select a.id, a.group_id, b.id, b.group_id
      into v_a_id, v_a_group, v_b_id, v_b_group
      from public.participants a
      join public.participants b
        on b.session_id = a.session_id
       and b.id <> a.id
       -- b is also a collision (both columns are non-null for an equality to
       -- hold), and sits in a different pack from a.
       and b.group_id = b.prev_group_id
       and b.group_id <> a.group_id
     where a.session_id = p_session_id
       and a.group_id = a.prev_group_id
     limit 1;

    exit when not found;

    -- a leaves for b's pack (not a's old one, since the packs differ) and b
    -- leaves for a's (not b's old one, for the same reason). Sizes unchanged.
    update public.participants set group_id = v_b_group where id = v_a_id;
    update public.participants set group_id = v_a_group where id = v_b_id;
  end loop;

  -- Pass B: whatever is left swaps with a player who is not a collision.
  v_guard := 0;
  loop
    v_guard := v_guard + 1;
    exit when v_guard > v_limit;

    select a.id, a.group_id
      into v_a_id, v_a_group
      from public.participants a
     where a.session_id = p_session_id
       and a.group_id = a.prev_group_id
     limit 1;

    exit when not found;

    select b.id, b.group_id
      into v_b_id, v_b_group
      from public.participants b
     where b.session_id = p_session_id
       and b.group_id is not null
       and b.group_id <> v_a_group
       -- b must not be sent into the pack it came from, which is the pack a is
       -- leaving.
       and b.prev_group_id is distinct from v_a_group
       -- and b must not already be a collision, or the swap just moves the
       -- problem around.
       and b.group_id is distinct from b.prev_group_id
     order by random()
     limit 1;

    -- No partner exists. Every remaining collision is in a's pack with a's
    -- history, so none of them can be fixed either: stop and accept the repeat.
    exit when not found;

    update public.participants set group_id = v_b_group where id = v_a_id;
    update public.participants set group_id = v_a_group where id = v_b_id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- _assign_to_smallest_group: for a player who arrived late or whose phone was
-- asleep at the round's start (ARCHITECTURE.md §5.2).
--
-- Replaces the B3 version. Only the ordering changed: among the groups tied for
-- smallest, one that is not this phone's previous pack is preferred.
--
-- Deliberately a tie-break and nothing stronger. Letting the "different animal"
-- rule outrank size would let a handful of waking phones all skip the smallest
-- pack and push sizes past ±1 (PRD A2), which the host can see on the
-- projector. So A6 is absolute for the round's deal and best-effort for a phone
-- that wakes up mid-round.
-- -----------------------------------------------------------------------------
create or replace function public._assign_to_smallest_group(p_participant_id uuid, p_session_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_prev_group_id uuid;
  v_group_id      uuid;
begin
  select prev_group_id into v_prev_group_id
    from public.participants
   where id = p_participant_id;

  -- Size first (so ±1 still holds), then prefer a pack this phone has not just
  -- had (false sorts before true), then the lowest sort_order — which keeps the
  -- tie-break pickSmallestGroup() in lib/assignment.ts mirrors.
  select g.id
    into v_group_id
    from public.groups g
    left join public.participants p on p.group_id = g.id
   where g.session_id = p_session_id
   group by g.id, g.sort_order
   order by count(p.id) asc,
            (g.id is not distinct from v_prev_group_id),
            g.sort_order asc
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
-- _host_state: adds `round` and `can_start_next_round`.
--
-- can_start_next_round is computed here, on the server, rather than from
-- reveal_at on the host page. The host page has no clock offset — only phones
-- correct their clock, via server_now and lib/server-clock.ts — so a laptop
-- running a few minutes fast would light the button up mid-reveal. The host
-- polls every 3 s, so the button appears within 3 s of the reveal finishing.
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
    'round',                p_session.round,
    -- "Active" matches ACTIVE_CUTOFF_SECONDS in lib/constants.ts. Start counts
    -- the same way, so the host's number is the number Start will act on.
    'active_count', (
      select count(*)
        from public.participants p
       where p.session_id = p_session.id
         and p.last_seen_at > now() - interval '60 seconds'
    ),
    -- The same three things start_next_round checks, so the button is enabled
    -- exactly when the call would succeed.
    'can_start_next_round', (
      p_session.status = 'started'
      and p_session.reveal_at is not null
      and now() >= p_session.reveal_at
                   + make_interval(secs => p_session.reveal_seconds + 3)
      and (
        select count(*)
          from public.participants p
         where p.session_id = p_session.id
           and p.last_seen_at > now() - interval '60 seconds'
      ) >= 2
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
-- start_session: unchanged behaviour, except that it now delegates the deal and
-- stamps round 1.
--
-- The idempotent early return on 'started' stays exactly as it was: a second
-- tap of Start must never reshuffle a game in progress. Starting another round
-- is a different, deliberate action — start_next_round.
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
    v_group_count := least(greatest(v_active_count / 3, 1), least(10, v_option_count));
  end if;

  -- The one moment groups come into existence (hard rule 4). Every later round
  -- reuses these rows, so this is also what fixes the number of packs for the
  -- whole game.
  insert into public.groups (session_id, name, emoji, sound_hint, sort_order)
  select p_session_id, e->>'name', e->>'emoji', e->>'sound_hint', (ord - 1)::int
    from jsonb_array_elements(v_session.group_options) with ordinality as t(e, ord)
   where ord <= v_group_count;

  -- Round 1 has no previous round to avoid.
  perform public._deal_round(p_session_id, v_group_count, false);

  -- Inactive rows are deliberately left unassigned. If they are real people
  -- whose phones were asleep, get_my_state assigns them the moment they wake.

  update public.sessions
     set status = 'started',
         round = 1,
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
-- start_next_round: deal the room again, with everyone on a new animal (H10).
--
-- There is no "between rounds" status. The session stays 'started' and the
-- round counter moves, which keeps every existing client path working: a phone
-- never sees a state that means "ended" mid-game, so it never stops polling and
-- never shows the feedback sheet early.
-- -----------------------------------------------------------------------------
create or replace function public.start_next_round(p_session_id uuid, p_host_secret text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_session      public.sessions;
  v_active_count int;
  v_group_count  int;
begin
  -- Locked for the whole deal, like Start (hard rule 7). Also what stops a
  -- waking phone being assigned by get_my_state halfway through the reshuffle.
  v_session := public._require_host(p_session_id, p_host_secret, true);

  if v_session.status <> 'started' then
    raise exception 'the game must be running before starting another round (session is %)', v_session.status;
  end if;

  -- The current round's reveal has to be over, for two reasons: cutting a
  -- reveal short would take the animal off everyone's screen mid-countdown, and
  -- this doubles as the guard against a double tap — a second call arrives
  -- inside the window it just set and is refused, so no extra idempotency flag
  -- is needed. REVEAL_GRACE_SECONDS matches get_my_state's window_end.
  if now() < v_session.reveal_at + make_interval(secs => v_session.reveal_seconds + 3) then
    raise exception 'the reveal is still running';
  end if;

  -- ACTIVE_CUTOFF_SECONDS / MIN_PLAYERS_TO_START, same as Start: a round with
  -- one phone left in the room is not a round.
  select count(*) into v_active_count
    from public.participants
   where session_id = p_session_id
     and last_seen_at > now() - interval '60 seconds';

  if v_active_count < 2 then
    raise exception 'at least 2 active players are needed to start a round (found %)', v_active_count;
  end if;

  -- The packs were fixed when the groups were created at Start, so a round
  -- never changes how many there are.
  select count(*) into v_group_count
    from public.groups
   where session_id = p_session_id;

  if v_group_count < 1 then
    raise exception 'this session has no groups';
  end if;

  -- Clear the whole room, not just the active phones.
  --
  --  * prev_group_id carries this round's pack forward as the one to avoid.
  --  * assigned_at must be nulled in the same statement: the table's
  --    assigned_has_time check ties it to group_id.
  --  * revealed_at is the load-bearing one. It anchors window_end in
  --    get_my_state and is otherwise written once and never cleared, so
  --    without this reset every phone would compute a window that closed
  --    minutes ago and drop straight to 'hidden' with no reveal at all.
  --  * clearing the *inactive* rows too is what stops someone who left after
  --    round 1 from still counting towards a round-2 pack size.
  update public.participants
     set prev_group_id = group_id,
         group_id = null,
         assigned_at = null,
         revealed_at = null
   where session_id = p_session_id;

  perform public._deal_round(p_session_id, v_group_count, true);

  update public.sessions
     set round = round + 1,
         started_at = now(),
         -- A fresh reveal_at is what gives the room another same-moment
         -- countdown, and what makes each phone's usePlayerScreen anchor
         -- (keyed on my_reveal_at) treat this as a new reveal.
         reveal_at = now() + interval '3 seconds'
   where id = p_session_id
  returning * into v_session;

  return public._host_state(v_session);
end;
$$;

-- -----------------------------------------------------------------------------
-- get_my_state: adds `round` to the two states that have one.
--
-- Replaces the D2 version. Nothing about hiding changes: past window_end the
-- group is still simply absent from the response (hard rule 5), which now
-- reads per round — a new round opens a new window, it does not reopen the old
-- one, because start_next_round cleared revealed_at and re-stamped reveal_at.
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
  -- a Start — or a round — running at the same moment.
  update public.participants
     set last_seen_at = now()
   where session_id = p_session_id
     and device_token_hash = v_hash
  returning * into v_part;

  -- No row means this device never joined, or lost the token it joined with.
  if not found then
    return jsonb_build_object('status', 'not_joined');
  end if;

  if v_session.status = 'lobby' then
    return jsonb_build_object('status', 'waiting', 'server_now', now());
  end if;

  -- ---- status = 'started' ----------------------------------------------------

  -- Late arrival, or a phone that was asleep when this round was dealt.
  if v_part.group_id is null then
    -- Lock the session so two phones waking together cannot both read the same
    -- group as smallest (ARCHITECTURE.md §5.2). The same lock is what makes a
    -- phone waking during start_next_round wait for the deal to finish.
    perform 1 from public.sessions where id = p_session_id for update;

    -- Re-read under the lock: another call may have assigned us while we waited.
    select * into v_part from public.participants where id = v_part.id;

    if v_part.group_id is null then
      perform public._assign_to_smallest_group(v_part.id, p_session_id);
      select * into v_part from public.participants where id = v_part.id;
    end if;
  end if;

  select * into v_group from public.groups where id = v_part.group_id;

  -- A late player counts down from their own assignment, not from the round's
  -- start, so they still get a countdown rather than an instant reveal.
  v_my_reveal_at := greatest(v_session.reveal_at, v_part.assigned_at + interval '3 seconds');

  if v_part.revealed_at is null then
    -- The window starts the first time the group is actually handed over, not
    -- at Start. This is what gives a phone unlocked ten minutes late its full
    -- reveal instead of an empty screen (PRD P7) — and, now, what gives it a
    -- full reveal of the round it woke up in.
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
    return jsonb_build_object(
      'status', 'hidden',
      'pack_size', v_pack_size,
      'round', v_session.round
    );
  end if;

  return jsonb_build_object(
    'status', 'reveal',
    'group', jsonb_build_object(
      'name', v_group.name, 'emoji', v_group.emoji, 'sound_hint', v_group.sound_hint
    ),
    'pack_size', v_pack_size,
    'my_reveal_at', v_my_reveal_at,
    'reveal_seconds', v_session.reveal_seconds,
    'round', v_session.round,
    'server_now', now()
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissions. Supabase grants EXECUTE on new functions to anon by default, so
-- the internal helper has to be taken back and the new host action handed out
-- explicitly (see 20261006000002_functions.sql).
-- -----------------------------------------------------------------------------
revoke execute on function public._deal_round(uuid, int, boolean)
  from public, anon, authenticated;

grant execute on function public.start_next_round(uuid, text) to anon;
