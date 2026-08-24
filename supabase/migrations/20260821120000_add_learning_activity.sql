create table if not exists public.learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_goal_seconds integer null check (
    weekly_goal_seconds is null
    or weekly_goal_seconds between 900 and 604800
  ),
  legacy_active_seconds bigint not null default 0 check (legacy_active_seconds >= 0),
  tracked_active_seconds bigint not null default 0 check (tracked_active_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  active_seconds bigint not null default 0 check (active_seconds >= 0),
  reading_seconds bigint not null default 0 check (reading_seconds >= 0),
  video_seconds bigint not null default 0 check (video_seconds >= 0),
  word_lookups integer not null default 0 check (word_lookups >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists learning_activity_daily_user_date_idx
  on public.learning_activity_daily (user_id, activity_date desc);

alter table public.learning_profiles enable row level security;
alter table public.learning_activity_daily enable row level security;

create policy "Users can read their learning profile"
  on public.learning_profiles for select
  using (auth.uid() = user_id);

create policy "Users can read their daily learning activity"
  on public.learning_activity_daily for select
  using (auth.uid() = user_id);

create or replace function public.increment_learning_activity(
  p_user_id uuid,
  p_activity_date date,
  p_active_seconds integer,
  p_reading_seconds integer,
  p_video_seconds integer,
  p_word_lookups integer
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.learning_activity_daily (
    user_id,
    activity_date,
    active_seconds,
    reading_seconds,
    video_seconds,
    word_lookups
  ) values (
    p_user_id,
    p_activity_date,
    greatest(p_active_seconds, 0),
    greatest(p_reading_seconds, 0),
    greatest(p_video_seconds, 0),
    greatest(p_word_lookups, 0)
  )
  on conflict (user_id, activity_date) do update set
    active_seconds = learning_activity_daily.active_seconds + excluded.active_seconds,
    reading_seconds = learning_activity_daily.reading_seconds + excluded.reading_seconds,
    video_seconds = learning_activity_daily.video_seconds + excluded.video_seconds,
    word_lookups = learning_activity_daily.word_lookups + excluded.word_lookups,
    updated_at = now();

  update public.learning_profiles set
    tracked_active_seconds = tracked_active_seconds + greatest(p_active_seconds, 0),
    updated_at = now()
  where user_id = p_user_id;
$$;

revoke all on function public.increment_learning_activity(uuid, date, integer, integer, integer, integer) from public;
revoke all on function public.increment_learning_activity(uuid, date, integer, integer, integer, integer) from anon;
revoke all on function public.increment_learning_activity(uuid, date, integer, integer, integer, integer) from authenticated;
grant execute on function public.increment_learning_activity(uuid, date, integer, integer, integer, integer) to service_role;
