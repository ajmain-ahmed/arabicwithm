create table public.email_preferences (
  email text not null check (email = lower(btrim(email)) and length(email) <= 254),
  purpose text not null check (purpose = 'app_launch'),
  subscribed boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  primary key (email, purpose)
);
alter table public.email_preferences enable row level security;
revoke all on public.email_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.email_preferences to service_role;
comment on table public.email_preferences is 'Explicit purpose-scoped email consent. Server-only access; no automatic account enrolment.';
