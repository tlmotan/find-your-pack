-- pgTAP tests, run with `npm run db:test` (supabase test db).
-- Must-test list from ARCHITECTURE-ESSENTIALS.md. Replace each todo with real checks.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select todo('anon cannot select/insert/update/delete any table directly', 1);
select pass('placeholder');
select todo('host functions reject a wrong secret', 1);
select pass('placeholder');
select todo('join_session creates no row while scheduled', 1);
select pass('placeholder');
select todo('start_session fails before open_lobby and with < 2 active players', 1);
select pass('placeholder');
select todo('start_session skips players inactive > 60 s', 1);
select pass('placeholder');
select todo('get_my_state assigns a waking player to the smallest group', 1);
select pass('placeholder');
select todo('get_my_state stops returning the group after window_end', 1);
select pass('placeholder');
select todo('a phone that first checks in late still gets a full reveal window', 1);
select pass('placeholder');
select todo('expired sessions reject all calls', 1);
select pass('placeholder');

select * from finish();
rollback;
