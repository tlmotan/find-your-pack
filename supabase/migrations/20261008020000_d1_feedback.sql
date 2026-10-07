-- =============================================================================
-- D1: post-game feedback (PRD F1).
--
-- The host reads this in the Supabase dashboard. Nothing in the app reads it
-- back, and that is a security property rather than an omission: the app ships
-- only the anon key, so any SECURITY DEFINER function that returned feedback
-- would return it to anyone who opened devtools. There is no login to put in
-- front of such a read, so the read stays out of the app entirely.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- feedback: one row per player who tapped Send.
--
-- Deliberately NOT a child of sessions. end_session hard-deletes the session
-- row, and a phone shows the ended screen precisely BECAUSE that row is gone —
-- so the feedback sheet appears at the one moment there is no parent left to
-- reference. A foreign key here would either reject every insert or cascade
-- the answers away as they arrived.
--
-- join_code is kept as a plain string for exactly that reason: it groups one
-- night's responses together without pointing at a row that no longer exists.
-- It is a random 6-character code, not an identifier of any person.
--
-- No device token, hashed or otherwise. Dedupe would be the only reason to
-- hold one, and a pseudonymous per-person identifier living for 30 days is a
-- worse trade than the spam it would prevent (see the note on abuse below).
-- -----------------------------------------------------------------------------
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- The emoji faces, 1 (Bad) to 5 (Great).
  rating     int not null check (rating between 1 and 5),

  -- The tapped chips. Capped so a crafted call can't post an unbounded array.
  reasons    text[] not null default '{}' check (array_length(reasons, 1) is null
                                                 or array_length(reasons, 1) <= 10),

  -- Free text, and the only field a person types into. The 300 cap is enforced
  -- here as well as in the form, because the form is not a security boundary.
  comment    text not null default '' check (length(comment) <= 300),

  -- Which night this came from. Not a foreign key; see above.
  join_code  text check (join_code is null or join_code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

-- Reading is always "the most recent first", in the dashboard or a query.
create index feedback_created_at_idx on public.feedback (created_at desc);

-- Locked like every other table: RLS on, no policies, all access through the
-- SECURITY DEFINER function below (hard rule 3).
alter table public.feedback enable row level security;

-- -----------------------------------------------------------------------------
-- submit_feedback: write one response (PRD F1).
--
-- No auth check, and none is possible: the session is already deleted by the
-- time this is called, so there is no secret or token left to verify against.
-- The function is therefore open to anyone holding the anon key, which is
-- public by design. What protects the table is that there is nothing worth
-- taking in it and every field is bounded — a caller can write junk, but not
-- an unbounded amount of it, and cannot read a single row back.
--
-- If junk ever does arrive, the fix is to drop this function; the game keeps
-- working without it, because the sheet ignores a failed submit.
-- -----------------------------------------------------------------------------
create or replace function public.submit_feedback(
  p_rating int,
  p_reasons text[] default '{}',
  p_comment text default '',
  p_join_code text default null
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_comment text;
  v_reasons text[];
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  -- Truncated rather than rejected: a player who somehow exceeds the cap has
  -- still given a real answer, and losing it to a validation error helps
  -- nobody. The CHECK constraints above remain the backstop.
  v_comment := left(coalesce(p_comment, ''), 300);
  -- Sliced in two steps: Postgres will not subscript a function-call
  -- expression, only a variable.
  v_reasons := coalesce(p_reasons, '{}');
  v_reasons := v_reasons[1:10];

  insert into public.feedback (rating, reasons, comment, join_code)
  values (p_rating, v_reasons, v_comment, p_join_code);

  return jsonb_build_object('ok', true);
end;
$$;

-- The anon key may call this and nothing else on the table.
revoke all on public.feedback from anon, authenticated;
grant execute on function public.submit_feedback(int, text[], text, text) to anon;

-- -----------------------------------------------------------------------------
-- Retention: 30 days.
--
-- Sessions are swept at 15-minute intervals because they are live state.
-- Feedback is not, so a daily sweep is enough. The point of the sweep is that
-- "what do you hold?" stays answerable: a month of ratings, and nothing that
-- identifies anyone.
-- -----------------------------------------------------------------------------
select cron.schedule(
  'delete-old-feedback',
  '17 3 * * *',
  $$ delete from public.feedback where created_at < now() - interval '30 days' $$
);
