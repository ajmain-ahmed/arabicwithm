begin;

create table if not exists public.word_search_completions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id uuid not null,
  source_type text not null check (source_type in ('episode', 'book')),
  source_id uuid not null,
  difficulty text not null default '' check (char_length(difficulty) <= 20),
  word_count smallint not null check (word_count between 1 and 10),
  words_found smallint not null check (words_found = word_count),
  mistakes integer not null default 0 check (mistakes between 0 and 10000),
  hints_used integer not null default 0 check (hints_used between 0 and 100),
  reveals_used integer not null default 0 check (reveals_used between 0 and 100),
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  xp_earned smallint not null check (xp_earned between 0 and 40),
  activity_date date not null default ((now() at time zone 'Europe/London')::date),
  completed_at timestamptz not null default now(),
  unique (user_id, puzzle_id)
);

create index if not exists word_search_completions_user_date_idx
  on public.word_search_completions (user_id, activity_date desc);

alter table public.word_search_completions enable row level security;

drop policy if exists "Users can read their Word Search completions" on public.word_search_completions;
create policy "Users can read their Word Search completions"
  on public.word_search_completions for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.word_search_completions from public, anon, authenticated;
grant select on table public.word_search_completions to authenticated;
grant all on table public.word_search_completions to service_role;

create or replace function public.learning_xp_totals(
  p_user_id uuid,
  p_since date default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'xp',
      coalesce((select sum(xp) from public.memory_reviews where user_id = p_user_id and (p_since is null or activity_date >= p_since)), 0)
      + coalesce((select sum(xp_earned) from public.word_search_completions where user_id = p_user_id and (p_since is null or activity_date >= p_since)), 0)
      + case when p_since is null then coalesce((select xp from public.memory_legacy_progress where user_id = p_user_id), 0) else 0 end,
    'memoryXp', coalesce((select sum(xp) from public.memory_reviews where user_id = p_user_id and (p_since is null or activity_date >= p_since)), 0),
    'wordSearchXp', coalesce((select sum(xp_earned) from public.word_search_completions where user_id = p_user_id and (p_since is null or activity_date >= p_since)), 0),
    'wordSearches', coalesce((select count(*) from public.word_search_completions where user_id = p_user_id and (p_since is null or activity_date >= p_since)), 0)
  );
$$;

revoke all on function public.learning_xp_totals(uuid, date) from public, anon, authenticated;
grant execute on function public.learning_xp_totals(uuid, date) to service_role;

create or replace function public.complete_word_search(
  p_user_id uuid,
  p_completion_id uuid,
  p_puzzle_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_difficulty text,
  p_word_count integer,
  p_words_found integer,
  p_mistakes integer,
  p_hints_used integer,
  p_reveals_used integer,
  p_duration_seconds integer,
  p_xp integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.word_search_completions;
  v_total integer;
  v_day date := (now() at time zone 'Europe/London')::date;
begin
  if p_source_type not in ('episode', 'book')
    or p_word_count not between 1 and 10
    or p_words_found <> p_word_count
    or p_mistakes not between 0 and 10000
    or p_hints_used not between 0 and 100
    or p_reveals_used not between 0 and 100
    or p_duration_seconds not between 1 and 86400
    or p_xp not between 0 and 40 then
    raise exception 'Invalid Word Search completion';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_existing
  from public.word_search_completions
  where user_id = p_user_id
    and (id = p_completion_id or puzzle_id = p_puzzle_id)
  limit 1;

  if found then
    select ((public.learning_xp_totals(p_user_id, null)->>'xp')::integer) into v_total;
    return jsonb_build_object('awarded', 0, 'totalXp', v_total, 'duplicate', true);
  end if;

  insert into public.word_search_completions (
    id, user_id, puzzle_id, source_type, source_id, difficulty,
    word_count, words_found, mistakes, hints_used, reveals_used,
    duration_seconds, xp_earned, activity_date
  ) values (
    p_completion_id, p_user_id, p_puzzle_id, p_source_type, p_source_id, left(coalesce(p_difficulty, ''), 20),
    p_word_count, p_words_found, p_mistakes, p_hints_used, p_reveals_used,
    p_duration_seconds, p_xp, v_day
  );

  insert into public.learning_profiles (user_id, tracked_active_seconds)
  values (p_user_id, p_duration_seconds)
  on conflict (user_id) do update set
    tracked_active_seconds = learning_profiles.tracked_active_seconds + excluded.tracked_active_seconds,
    updated_at = now();

  insert into public.learning_activity_daily (user_id, activity_date, active_seconds)
  values (p_user_id, v_day, p_duration_seconds)
  on conflict (user_id, activity_date) do update set
    active_seconds = learning_activity_daily.active_seconds + excluded.active_seconds,
    updated_at = now();

  select ((public.learning_xp_totals(p_user_id, null)->>'xp')::integer) into v_total;
  return jsonb_build_object('awarded', p_xp, 'totalXp', v_total, 'duplicate', false);
end;
$$;

revoke all on function public.complete_word_search(uuid, uuid, uuid, text, uuid, text, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.complete_word_search(uuid, uuid, uuid, text, uuid, text, integer, integer, integer, integer, integer, integer, integer)
  to service_role;

notify pgrst, 'reload schema';

commit;
