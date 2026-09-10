begin;
alter table public.books add column if not exists author text;
-- All catalogue writes go through server actions guarded by guardAdmin().
revoke insert, update, delete on public.books, public.chapters from anon, authenticated;
create table if not exists public.feedback (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant all on public.feedback to service_role;
notify pgrst, 'reload schema';
commit;
