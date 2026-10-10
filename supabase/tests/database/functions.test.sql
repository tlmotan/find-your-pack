-- pgTAP tests, run with `npm run db:test` (supabase test db).
-- Must-test list from ARCHITECTURE-ESSENTIALS.md. Replace each todo with real
-- checks as the matching function is built.

begin;
create extension if not exists pgtap with schema extensions;
select plan(116);

-- -----------------------------------------------------------------------------
-- Lock-down: RLS is on with no policies and the grants are revoked, so the anon
-- key must have no way to touch a table directly (hard rule 3).
-- -----------------------------------------------------------------------------
select ok(
  not (has_table_privilege('anon', 'public.sessions', 'SELECT')
    or has_table_privilege('anon', 'public.sessions', 'INSERT')
    or has_table_privilege('anon', 'public.sessions', 'UPDATE')
    or has_table_privilege('anon', 'public.sessions', 'DELETE')),
  'anon cannot read or write sessions directly'
);
select ok(
  not (has_table_privilege('anon', 'public.groups', 'SELECT')
    or has_table_privilege('anon', 'public.groups', 'INSERT')
    or has_table_privilege('anon', 'public.groups', 'UPDATE')
    or has_table_privilege('anon', 'public.groups', 'DELETE')),
  'anon cannot read or write groups directly'
);
select ok(
  not (has_table_privilege('anon', 'public.participants', 'SELECT')
    or has_table_privilege('anon', 'public.participants', 'INSERT')
    or has_table_privilege('anon', 'public.participants', 'UPDATE')
    or has_table_privilege('anon', 'public.participants', 'DELETE')),
  'anon cannot read or write participants directly'
);
select ok(
  not has_function_privilege('anon', 'public._host_state(public.sessions)', 'EXECUTE'),
  'internal _host_state is not callable with the anon key'
);

-- -----------------------------------------------------------------------------
-- create_session
-- -----------------------------------------------------------------------------
create temporary table fixture as
  select public.create_session(
    'animals',
    '[{"name":"Cow","emoji":"🐮","sound_hint":"Moo!"},{"name":"Dog","emoji":"🐶","sound_hint":"Woof!"}]'::jsonb,
    5, 7
  ) as s;

select isnt((select s->>'session_id' from fixture), null, 'create_session returns a session id');

select matches(
  (select s->>'join_code' from fixture),
  '^[A-HJ-NP-Z2-9]{6}$',
  'join code uses the no-lookalike alphabet'
);

select is(
  (select status::text from public.sessions where id = (select (s->>'session_id')::uuid from fixture)),
  'scheduled',
  'a new session starts scheduled, not open for joining'
);

-- The raw secret must never be recoverable from the database (hard rule 2).
select is(
  (select count(*)::int from public.sessions
    where host_secret_hash = (select s->>'host_secret' from fixture)),
  0,
  'the raw host secret is not stored'
);
select is(
  (select host_secret_hash from public.sessions where id = (select (s->>'session_id')::uuid from fixture)),
  (select public._hash_token(s->>'host_secret') from fixture),
  'only the SHA-256 of the host secret is stored'
);

select ok(
  (select expires_at from public.sessions where id = (select (s->>'session_id')::uuid from fixture))
    between now() + interval '6 days' and now() + interval '7 days',
  'expires_at honours expires_in_days'
);

select throws_ok(
  $$ select public.create_session('animals', '[{"name":"Only"}]'::jsonb, 5, 7) $$,
  'P0001', null, 'create_session rejects fewer than 2 groups'
);
select throws_ok(
  $$ select public.create_session('animals', '[{"name":"A"},{"name":""}]'::jsonb, 5, 7) $$,
  'P0001', null, 'create_session rejects an empty group name'
);
select throws_ok(
  $$ select public.create_session('animals', '[{"name":"A"},{"name":"B"}]'::jsonb, 1, 7) $$,
  'P0001', null, 'create_session rejects reveal_seconds below the range'
);
select throws_ok(
  $$ select public.create_session('animals', '[{"name":"A"},{"name":"B"}]'::jsonb, 5, 8) $$,
  'P0001', null, 'create_session rejects more than 7 days'
);

-- -----------------------------------------------------------------------------
-- Host auth
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select public.get_host_state(%L::uuid, 'wrong-secret') $$,
         (select s->>'session_id' from fixture)),
  'P0003', null, 'get_host_state rejects a wrong secret'
);
select throws_ok(
  format($$ select public.open_lobby(%L::uuid, 'wrong-secret') $$,
         (select s->>'session_id' from fixture)),
  'P0003', null, 'open_lobby rejects a wrong secret'
);
select throws_ok(
  $$ select public.get_host_state('00000000-0000-0000-0000-000000000000'::uuid, 'x') $$,
  'P0002', null, 'host functions reject an unknown session'
);

-- Expiry is checked on every host call, not only by the cleanup cron.
-- created_at moves too: the CHECK requires expires_at > created_at, so an
-- expired row can only exist if it was created earlier still.
update public.sessions
   set created_at = now() - interval '2 days',
       expires_at = now() - interval '1 second'
 where id = (select (s->>'session_id')::uuid from fixture);
select throws_ok(
  format($$ select public.get_host_state(%L::uuid, %L) $$,
         (select s->>'session_id' from fixture), (select s->>'host_secret' from fixture)),
  'P0002', null, 'an expired session rejects host calls'
);
update public.sessions
   set created_at = now(),
       expires_at = now() + interval '7 days'
 where id = (select (s->>'session_id')::uuid from fixture);

-- -----------------------------------------------------------------------------
-- get_host_state payload
-- -----------------------------------------------------------------------------
select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'active_count')::int from fixture),
  0,
  'a fresh session has no active players'
);
select is(
  (select public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'group_sizes' from fixture),
  '[]',
  'no groups exist before Start (hard rule 4)'
);

-- -----------------------------------------------------------------------------
-- open_lobby
-- -----------------------------------------------------------------------------
select is(
  (select public.open_lobby((s->>'session_id')::uuid, s->>'host_secret')->>'status' from fixture),
  'lobby',
  'open_lobby moves scheduled to lobby'
);
select isnt(
  (select lobby_opened_at from public.sessions where id = (select (s->>'session_id')::uuid from fixture)),
  null,
  'open_lobby records when the lobby opened'
);
select is(
  (select public.open_lobby((s->>'session_id')::uuid, s->>'host_secret')->>'status' from fixture),
  'lobby',
  'open_lobby is idempotent, so a double tap is not an error'
);

-- -----------------------------------------------------------------------------
-- join_session (B2). The fixture session is in 'lobby' by this point.
-- -----------------------------------------------------------------------------

-- A second session, kept scheduled, to prove the Open-lobby gate.
create temporary table scheduled_fixture as
  select public.create_session('animals', '[{"name":"Cow"},{"name":"Dog"}]'::jsonb, 5, 7) as s;

select is(
  (select public.join_session(s->>'join_code', 'device-early')->>'status' from scheduled_fixture),
  'not_open',
  'join_session refuses while the session is scheduled'
);
select is(
  (select count(*)::int from public.participants
    where session_id = (select (s->>'session_id')::uuid from scheduled_fixture)),
  0,
  'join_session creates no row while scheduled, so early scans are not counted'
);

select is(
  (select public.join_session(s->>'join_code', 'device-a')->>'status' from fixture),
  'joined',
  'join_session admits a player once the lobby is open'
);
select is(
  (select public.join_session(s->>'join_code', 'device-a')->>'session_id' from fixture),
  (select s->>'session_id' from fixture),
  'join_session returns the session to play in'
);

-- Only the hash is stored (hard rule 2).
select is(
  (select count(*)::int from public.participants where device_token_hash = 'device-a'),
  0,
  'the raw device token is never stored'
);
select is(
  (select count(*)::int from public.participants
    where device_token_hash = public._hash_token('device-a')),
  1,
  'the device token is stored only as its SHA-256'
);

-- A refresh or a second scan is the same phone, not a second player.
select is(
  (select public.join_session(s->>'join_code', 'device-a')->>'status' from fixture),
  'joined',
  'joining twice from one device is allowed'
);
select is(
  (select count(*)::int from public.participants
    where session_id = (select (s->>'session_id')::uuid from fixture)),
  1,
  'joining twice from one device creates one participant, not two'
);

select is(
  (select public.join_session('ZZZZZZ', 'device-a')->>'status'),
  'ended',
  'an unknown join code reads as ended'
);
select is(
  (select public.join_session('nope', 'device-a')->>'status'),
  'ended',
  'a malformed join code reads as ended'
);
select throws_ok(
  (select format($$ select public.join_session(%L, '') $$, s->>'join_code') from fixture),
  'P0001', null, 'join_session requires a device token'
);

-- Codes are read off a projector and retyped; case must not matter.
select is(
  (select public.join_session(lower(s->>'join_code'), 'device-lower')->>'status' from fixture),
  'joined',
  'a lowercase join code still works'
);

-- -----------------------------------------------------------------------------
-- get_my_state (B2 branches)
-- -----------------------------------------------------------------------------
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'device-a')->>'status' from fixture),
  'waiting',
  'a joined player waits while the session is in lobby'
);
select isnt(
  (select public.get_my_state((s->>'session_id')::uuid, 'device-a')->>'server_now' from fixture),
  null,
  'waiting carries server_now, so the phone can correct its clock'
);
-- 'not_joined', not 'ended': the d2 migration split the two so a phone that
-- lost its device token is told to scan again instead of being told the host
-- ended a game that is still running. This assertion still wanted the old
-- answer and had been failing since.
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'never-joined')->>'status' from fixture),
  'not_joined',
  'a device that never joined is not given a state'
);
-- The call above used a device that never joined; it must not have created one.
select is(
  (select count(*)::int from public.participants
    where device_token_hash = public._hash_token('never-joined')),
  0,
  'get_my_state never creates a participant row, so it cannot bypass Open lobby'
);
select is(
  (select public.get_my_state('00000000-0000-0000-0000-000000000000'::uuid, 'device-a')->>'status'),
  'ended',
  'an unknown session reads as ended'
);
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'device-early')->>'status' from scheduled_fixture),
  'not_open',
  'a scheduled session reads as not_open'
);

-- The heartbeat is what tells Start a real phone from a ghost.
update public.participants set last_seen_at = now() - interval '10 minutes'
 where session_id = (select (s->>'session_id')::uuid from fixture);
-- Two statements on purpose: the heartbeat write must be committed to the
-- snapshot before the row is read back, which a single statement cannot do.
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'device-a')->>'status' from fixture),
  'waiting',
  'a stale phone checking in is still just waiting'
);
select ok(
  (select last_seen_at from public.participants
     where session_id = (select (s->>'session_id')::uuid from fixture)
       and device_token_hash = public._hash_token('device-a')) > now() - interval '5 seconds',
  'get_my_state beats the heart, refreshing last_seen_at'
);

-- =============================================================================
-- B3: Start, assignment, reveal window
-- =============================================================================

-- A session with 10 animal names, used for the assignment tests.
create temporary table game as
  select public.create_session(
    'animals',
    (select jsonb_agg(jsonb_build_object('name', n, 'emoji', 'X', 'sound_hint', n || '!'))
       from unnest(array['Cow','Dog','Cat','Duck','Sheep','Chicken','Pig','Monkey','Frog','Snake']) as n)
    , 5, 7) as s;

select throws_ok(
  (select format($$ select public.start_session(%L::uuid, %L) $$, s->>'session_id', s->>'host_secret') from game),
  'P0001', null, 'start_session refuses before the lobby is open'
);

select is((select public.open_lobby((s->>'session_id')::uuid, s->>'host_secret')->>'status' from game),
          'lobby', 'lobby opens for the game fixture');

-- One player is not enough to play.
select is((select public.join_session(s->>'join_code', 'p01')->>'status' from game), 'joined', 'first player joins');
select throws_ok(
  (select format($$ select public.start_session(%L::uuid, %L) $$, s->>'session_id', s->>'host_secret') from game),
  'P0001', null, 'start_session refuses with fewer than 2 active players'
);

-- Nine players total: floor(9/3) = 3 groups.
select is((select count(*)::int from (
    select public.join_session((select s->>'join_code' from game), 'p' || lpad(g::text, 2, '0'))
      from generate_series(2, 9) as g) z),
  8, 'eight more players join');

-- One of them goes quiet before Start.
update public.participants set last_seen_at = now() - interval '5 minutes'
 where session_id = (select (s->>'session_id')::uuid from game)
   and device_token_hash = public._hash_token('p09');

select is(
  (select (public.start_session((s->>'session_id')::uuid, s->>'host_secret')->>'status') from game),
  'started', 'start_session starts the game'
);

-- 8 active players -> floor(8/3) = 2 groups.
select is(
  (select count(*)::int from public.groups where session_id = (select (s->>'session_id')::uuid from game)),
  2, 'group count is floor(active / 3), clamped'
);

select is(
  (select count(*)::int from public.participants
    where session_id = (select (s->>'session_id')::uuid from game) and group_id is not null),
  8, 'start_session skips players inactive over 60 s'
);

select is(
  (select count(*)::int from public.participants
    where device_token_hash = public._hash_token('p09') and group_id is null),
  1, 'the inactive player is left unassigned, not counted into a pack'
);

-- Balance within +/-1 (ARCHITECTURE.md 5.1).
select ok(
  (select max(c) - min(c) <= 1 from (
     select count(*) as c from public.participants
      where session_id = (select (s->>'session_id')::uuid from game) and group_id is not null
      group by group_id) z),
  'pack sizes differ by at most 1'
);

select is(
  (select count(distinct sort_order)::int from public.groups
    where session_id = (select (s->>'session_id')::uuid from game)),
  2, 'groups are numbered from 0 without gaps'
);

-- Groups must not exist before Start (hard rule 4) - checked on a fresh session.
select is(
  (select count(*)::int from public.groups where session_id = (select (s->>'session_id')::uuid from scheduled_fixture)),
  0, 'no groups exist for a session that has not started'
);

-- -----------------------------------------------------------------------------
-- The reveal window
-- -----------------------------------------------------------------------------
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'status' from game),
  'reveal', 'a started player is given their group'
);
select isnt(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->'group'->>'name' from game),
  null, 'the reveal carries the group name'
);
select isnt(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'my_reveal_at' from game),
  null, 'the reveal carries my_reveal_at for the countdown'
);
select isnt(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'server_now' from game),
  null, 'the reveal carries server_now for clock correction'
);
select ok(
  (select (public.get_my_state((s->>'session_id')::uuid, 'p01')->>'pack_size')::int between 3 and 5 from game),
  'the reveal carries a plausible pack size'
);

-- revealed_at is stamped once, the first time the group is handed over.
select isnt(
  (select revealed_at from public.participants
    where device_token_hash = public._hash_token('p01')
      and session_id = (select (s->>'session_id')::uuid from game)),
  null, 'revealed_at is set the first time the group is returned'
);

-- Push this player's window into the past.
update public.participants
   set revealed_at = now() - interval '1 hour', assigned_at = now() - interval '1 hour'
 where device_token_hash = public._hash_token('p01')
   and session_id = (select (s->>'session_id')::uuid from game);
update public.sessions set reveal_at = now() - interval '1 hour'
 where id = (select (s->>'session_id')::uuid from game);

select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'status' from game),
  'hidden', 'get_my_state stops returning the group after window_end'
);
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'group' from game),
  null, 'the group is absent from the response, not merely hidden by the client'
);
select isnt(
  (select public.get_my_state((s->>'session_id')::uuid, 'p01')->>'pack_size' from game),
  null, 'pack size survives hiding, so the player still knows who to look for'
);

-- -----------------------------------------------------------------------------
-- The phone that was asleep at Start (PRD P7)
-- -----------------------------------------------------------------------------
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'p09')->>'status' from game),
  'reveal', 'a phone that first checks in late still gets its reveal'
);
select is(
  (select count(*)::int from public.participants
    where device_token_hash = public._hash_token('p09') and group_id is not null),
  1, 'the waking player is assigned on check-in'
);
select ok(
  (select (public.get_my_state((s->>'session_id')::uuid, 'p09')->>'my_reveal_at')::timestamptz > now() - interval '5 seconds' from game),
  'the waking player counts down from their own assignment, not from Start'
);
select ok(
  (select max(c) - min(c) <= 1 from (
     select count(*) as c from public.participants
      where session_id = (select (s->>'session_id')::uuid from game) and group_id is not null
      group by group_id) z),
  'the waking player goes to the smallest group, keeping balance'
);

-- -----------------------------------------------------------------------------
-- Idempotence
-- -----------------------------------------------------------------------------
select is(
  (select public.start_session((s->>'session_id')::uuid, s->>'host_secret')->>'status' from game),
  'started', 'start_session is idempotent'
);
select is(
  (select count(*)::int from public.groups where session_id = (select (s->>'session_id')::uuid from game)),
  2, 'a second Start does not create more groups or reshuffle anyone'
);

-- =============================================================================
-- C1: update_settings and end_session
-- =============================================================================

create temporary table settings_fixture as
  select public.create_session('animals', '[{"name":"Cow"},{"name":"Dog"},{"name":"Cat"}]'::jsonb, 5, 7) as s;

select is(
  (select (public.update_settings((s->>'session_id')::uuid, s->>'host_secret', 12, null, null)->>'reveal_seconds')::int
     from settings_fixture),
  12, 'update_settings changes the reveal timer'
);
select is(
  (select reveal_seconds from public.sessions
    where id = (select (s->>'session_id')::uuid from settings_fixture)),
  12, 'the new reveal timer is persisted'
);

-- Each argument is null for "leave alone".
select is(
  (select (public.update_settings((s->>'session_id')::uuid, s->>'host_secret', null, 2, null)->>'reveal_seconds')::int
     from settings_fixture),
  12, 'a null argument leaves that setting untouched'
);
select is(
  (select (public.update_settings((s->>'session_id')::uuid, s->>'host_secret', null, null, null)->>'group_count_override')::int
     from settings_fixture),
  2, 'the group count override is persisted'
);

select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, 1, null, null) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'update_settings rejects a reveal timer below the range'
);
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, 31, null, null) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'update_settings rejects a reveal timer above the range'
);
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, null, 4, null) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'the group count cannot exceed the number of group names'
);
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, null, null, 8) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'update_settings rejects more than 7 days'
);
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, 'wrong', 10, null, null) $$, s->>'session_id')
     from settings_fixture),
  'P0003', null, 'update_settings rejects a wrong host secret'
);

-- Expiry is recomputed from created_at, so repeated saves cannot walk a
-- session past the 7-day cap.
select ok(
  (select public.update_settings((s->>'session_id')::uuid, s->>'host_secret', null, null, 3) is not null
     from settings_fixture),
  'session length can be shortened'
);
select ok(
  (select expires_at - created_at = interval '3 days' from public.sessions
    where id = (select (s->>'session_id')::uuid from settings_fixture)),
  'expiry is measured from created_at, not from now'
);

-- A host must not be able to delete their own game via a dropdown.
update public.sessions set created_at = now() - interval '5 days', expires_at = now() + interval '2 days'
 where id = (select (s->>'session_id')::uuid from settings_fixture);
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, null, null, 1) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'a session length that would expire the game immediately is refused'
);

-- Settings freeze at Start: phones are already counting down to windows
-- derived from reveal_seconds.
select is((select public.open_lobby((s->>'session_id')::uuid, s->>'host_secret')->>'status' from settings_fixture),
          'lobby', 'settings fixture opens its lobby');
select is((select public.join_session(s->>'join_code', 'sp1')->>'status' from settings_fixture), 'joined', 'first settings player joins');
select is((select public.join_session(s->>'join_code', 'sp2')->>'status' from settings_fixture), 'joined', 'second settings player joins');
select is((select public.start_session((s->>'session_id')::uuid, s->>'host_secret')->>'status' from settings_fixture),
          'started', 'settings fixture starts');
select throws_ok(
  (select format($$ select public.update_settings(%L::uuid, %L, 7, null, null) $$, s->>'session_id', s->>'host_secret')
     from settings_fixture),
  'P0001', null, 'settings cannot be changed once the game has started'
);

-- end_session deletes everything, which is the whole privacy story.
select throws_ok(
  (select format($$ select public.end_session(%L::uuid, 'wrong') $$, s->>'session_id') from settings_fixture),
  'P0003', null, 'end_session rejects a wrong host secret'
);
select is(
  (select (public.end_session((s->>'session_id')::uuid, s->>'host_secret')->>'ok')::boolean from settings_fixture),
  true, 'end_session reports success'
);
select is(
  (select count(*)::int from public.sessions where id = (select (s->>'session_id')::uuid from settings_fixture)),
  0, 'end_session deletes the session row'
);
select is(
  (select count(*)::int from public.participants where session_id = (select (s->>'session_id')::uuid from settings_fixture)),
  0, 'participants go with it, through the cascade'
);
select is(
  (select count(*)::int from public.groups where session_id = (select (s->>'session_id')::uuid from settings_fixture)),
  0, 'groups go with it too, so nothing is retained after a game'
);
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'sp1')->>'status' from settings_fixture),
  'ended', 'a phone still polling a deleted session is told it ended'
);

-- =============================================================================
-- E1: Multiple rounds (PRD H10, A6)
-- =============================================================================

-- Its own session, so the earlier fixtures' expectations stay untouched.
-- 11 players over 3 packs: an uneven split, which is where the repair passes
-- actually have work to do.
create temporary table rounds_fixture as
  select public.create_session(
    'animals',
    (select jsonb_agg(jsonb_build_object('name', n, 'emoji', 'X', 'sound_hint', n || '!'))
       from unnest(array['Cow','Dog','Cat','Duck','Sheep','Chicken','Pig','Monkey','Frog','Snake']) as n)
    , 2, 7) as s;

select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'round')::int from rounds_fixture),
  0, 'round is 0 before Start'
);

select throws_ok(
  (select format($$ select public.start_next_round(%L::uuid, %L) $$, s->>'session_id', s->>'host_secret') from rounds_fixture),
  'P0001', null, 'start_next_round refuses before the game is running'
);

select ok(
  (select public.open_lobby((s->>'session_id')::uuid, s->>'host_secret')->>'status' = 'lobby' from rounds_fixture),
  'rounds fixture lobby opens'
);

do $$
declare v_code text; v_id uuid; i int;
begin
  select (s->>'join_code'), (s->>'session_id')::uuid into v_code, v_id from rounds_fixture;
  for i in 1..11 loop
    perform public.join_session(v_code, 'r' || i);
  end loop;
  update public.sessions set group_count_override = 3 where id = v_id;
end $$;

select is(
  (select public.start_session((s->>'session_id')::uuid, s->>'host_secret')->>'status' from rounds_fixture),
  'started', 'rounds fixture starts'
);
select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'round')::int from rounds_fixture),
  1, 'Start stamps round 1'
);

-- Every phone fetches once, so revealed_at is set exactly as in a real round.
do $$
declare i int; v_id uuid;
begin
  select (s->>'session_id')::uuid into v_id from rounds_fixture;
  for i in 1..11 loop perform public.get_my_state(v_id, 'r' || i); end loop;
end $$;

select is(
  (select (public.get_my_state((s->>'session_id')::uuid, 'r1')->>'round')::int from rounds_fixture),
  1, 'get_my_state reports the round'
);

-- The reveal is still running, which is also the double-tap guard.
select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'can_start_next_round')::boolean from rounds_fixture),
  false, 'can_start_next_round is false while the reveal is running'
);
select throws_ok(
  (select format($$ select public.start_next_round(%L::uuid, %L) $$, s->>'session_id', s->>'host_secret') from rounds_fixture),
  'P0001', null, 'start_next_round refuses while the reveal is still running'
);

-- Wind the reveal back so the window has closed, as it would have in the room.
update public.sessions
   set reveal_at = now() - interval '30 seconds'
 where id = (select (s->>'session_id')::uuid from rounds_fixture);

select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'can_start_next_round')::boolean from rounds_fixture),
  true, 'can_start_next_round opens once the reveal is over'
);
select throws_ok(
  (select format($$ select public.start_next_round(%L::uuid, %L) $$, s->>'session_id', 'wrong-secret') from rounds_fixture),
  'P0003', null, 'start_next_round rejects a wrong host secret'
);

-- Remember round 1 before it is overwritten, to check nobody repeats.
create temporary table round1 as
  select id, group_id from public.participants
   where session_id = (select (s->>'session_id')::uuid from rounds_fixture);

select is(
  (select (public.start_next_round((s->>'session_id')::uuid, s->>'host_secret')->>'round')::int from rounds_fixture),
  2, 'start_next_round moves to round 2'
);

select is(
  (select count(*)::int from public.participants p join round1 r on r.id = p.id
    where p.group_id = r.group_id),
  0, 'no player keeps the pack they had last round (A6)'
);
select is(
  (select count(*)::int from public.participants p join round1 r on r.id = p.id
    where p.prev_group_id is distinct from r.group_id),
  0, 'prev_group_id carries last round forward for everyone'
);
select is(
  (select max(c)::int - min(c)::int from (
     select count(*) c from public.participants
      where session_id = (select (s->>'session_id')::uuid from rounds_fixture)
        and group_id is not null
      group by group_id) t),
  1, 'pack sizes stay within ±1 after a reshuffle (A2)'
);
select is(
  (select count(*)::int from public.groups
    where session_id = (select (s->>'session_id')::uuid from rounds_fixture)),
  3, 'a new round reuses the same groups rather than making more'
);
select is(
  (select count(*)::int from public.participants
    where session_id = (select (s->>'session_id')::uuid from rounds_fixture)
      and revealed_at is not null),
  0, 'revealed_at is cleared, so the reveal window reopens for the new round'
);

-- The whole point: the phone is given a group again, not left on 'hidden'.
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'r1')->>'status' from rounds_fixture),
  'reveal', 'a phone gets a fresh reveal in the new round'
);
select is(
  (select (public.get_my_state((s->>'session_id')::uuid, 'r1')->>'round')::int from rounds_fixture),
  2, 'and is told which round it is'
);

-- A phone that was asleep for the whole round still gets assigned on waking,
-- and still gets its own countdown (P7, A3).
do $$
declare v_id uuid; v_group uuid;
begin
  select (s->>'session_id')::uuid into v_id from rounds_fixture;
  update public.participants
     set group_id = null, assigned_at = null, revealed_at = null,
         last_seen_at = now() - interval '5 minutes'
   where session_id = v_id and device_token_hash = public._hash_token('r11');
  perform public.get_my_state(v_id, 'r11');
  select group_id into v_group from public.participants
   where session_id = v_id and device_token_hash = public._hash_token('r11');
  if v_group is null then raise exception 'a waking phone was not assigned'; end if;
end $$;

select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'r11')->>'status' from rounds_fixture),
  'reveal', 'a phone that woke mid-round is assigned and revealed'
);

-- Below MIN_PLAYERS_TO_START the room has gone home, so a round is refused.
do $$
declare v_id uuid;
begin
  select (s->>'session_id')::uuid into v_id from rounds_fixture;
  update public.sessions set reveal_at = now() - interval '30 seconds' where id = v_id;
  update public.participants set last_seen_at = now() - interval '5 minutes'
   where session_id = v_id
     and device_token_hash <> public._hash_token('r1');
end $$;

select is(
  (select (public.get_host_state((s->>'session_id')::uuid, s->>'host_secret')->>'can_start_next_round')::boolean from rounds_fixture),
  false, 'can_start_next_round closes again when the room empties'
);
select throws_ok(
  (select format($$ select public.start_next_round(%L::uuid, %L) $$, s->>'session_id', s->>'host_secret') from rounds_fixture),
  'P0001', null, 'start_next_round refuses with fewer than 2 active players'
);

-- The internal helper must not be reachable with the anon key.
select ok(
  not has_function_privilege('anon', 'public._deal_round(uuid, int, boolean)', 'EXECUTE'),
  'internal _deal_round is not callable with the anon key'
);
select ok(
  has_function_privilege('anon', 'public.start_next_round(uuid, text)', 'EXECUTE'),
  'start_next_round is callable with the anon key'
);

select * from finish();
rollback;
