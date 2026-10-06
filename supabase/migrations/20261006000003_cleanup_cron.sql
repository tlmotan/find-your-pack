-- =============================================================================
-- Delete expired sessions every 15 minutes (cascades to groups and participants).
-- Sessions last at most 7 days (ARCHITECTURE.md §4.2, §7).
-- =============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'delete-expired-sessions',
  '*/15 * * * *',
  $$ delete from public.sessions where expires_at < now() $$
);
