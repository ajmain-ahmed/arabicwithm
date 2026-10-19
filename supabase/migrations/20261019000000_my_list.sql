-- My List: Netflix-style per-user saved shows.
-- Accessed only through server actions (service role) with the caller's
-- user_id applied to every query; RLS policies below still constrain any
-- direct client access to the caller's own rows.

create table if not exists public.my_list (
  user_id uuid not null references auth.users (id) on delete cascade,
  show_id uuid not null references public.shows (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

create index if not exists my_list_show_idx on public.my_list (show_id);

alter table public.my_list enable row level security;

create policy "my_list_select_own" on public.my_list
  for select to authenticated using (auth.uid() = user_id);

create policy "my_list_insert_own" on public.my_list
  for insert to authenticated with check (auth.uid() = user_id);

create policy "my_list_delete_own" on public.my_list
  for delete to authenticated using (auth.uid() = user_id);
