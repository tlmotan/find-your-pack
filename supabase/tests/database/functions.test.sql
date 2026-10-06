-- pgTAP tests, run with `npm run db:test` (supabase test db).
-- Must-test list from ARCHITECTURE-ESSENTIALS.md. Replace each todo with real
-- checks as the matching function is built.

begin;
create extension if not exists pgtap with schema extensions;
select plan(70);

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
select is(
  (select public.get_my_state((s->>'session_id')::uuid, 'never-joined')->>'status' from fixture),
  'ended',
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

select * from finish();
rollback;
