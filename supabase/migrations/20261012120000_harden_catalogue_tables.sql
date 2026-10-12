-- Harden catalogue and dictionary tables against the public anon key.
-- These tables pre-date the platform migrations and still carried Supabase's
-- default grants, so the anon/publishable key could read every row — full
-- episode transcripts, full (untruncated) Hans Wehr definitions, and phrases.
-- Mutations were already denied; this closes the read path too.
-- All application access goes through the service-role client, which is
-- explicitly granted here. Idempotent: safe to re-run.
begin;

alter table public.shows enable row level security;
alter table public.episodes enable row level security;
alter table public.hanswehr_dictionary enable row level security;
alter table public.phrases enable row level security;

revoke all on public.shows, public.episodes, public.hanswehr_dictionary, public.phrases
  from anon, authenticated;
grant all on public.shows, public.episodes, public.hanswehr_dictionary, public.phrases
  to service_role;

notify pgrst, 'reload schema';
commit;
