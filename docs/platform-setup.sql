-- Run this complete file in the connected Supabase project SQL Editor.
-- Additive repair for the missing learning/Memory storage. Existing content and users are preserved.
begin;

-- supabase/migrations/20260821120000_add_learning_activity.sql
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

drop policy if exists "Users can read their learning profile" on public.learning_profiles;
create policy "Users can read their learning profile"
  on public.learning_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read their daily learning activity" on public.learning_activity_daily;
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


-- supabase/migrations/20260909120000_platform_premium_memory.sql
-- Additive migration: existing progress, XP and metadata remain intact.
alter table public.books add column if not exists author text;
alter table public.books add column if not exists premium_exempt boolean not null default false;
alter table public.books add column if not exists free_chapter_count integer not null default 5 check (free_chapter_count >= 0);
update public.books set premium_exempt = true where lower(trim(title)) in
 ('blackwood manor', 'layla and the shadow', 'the stranger who knows my name', 'when learning feels real');

create table if not exists public.subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 customer_id text unique not null,
 subscription_id text unique,
 status text not null default 'incomplete',
 current_period_end timestamptz not null default '1970-01-01',
 cancel_at_period_end boolean not null default false,
 event_created bigint not null default 0
);
create table if not exists public.memory_reviews (
 user_id uuid not null references auth.users(id) on delete cascade,
 completion_id uuid not null,
 card_id text not null,
 rating text not null check (rating in ('again','known')),
 activity_date date not null,
 xp integer not null default 0,
 created_at timestamptz not null default now(),
 primary key(user_id, completion_id)
);
create index if not exists memory_reviews_user_date on public.memory_reviews(user_id, activity_date);
create table if not exists public.memory_sessions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.public_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Arabic learner',
 is_public boolean not null default false,
 share_reading boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
alter table public.memory_reviews enable row level security;
alter table public.memory_sessions enable row level security;
alter table public.public_profiles enable row level security;
revoke all on public.subscriptions, public.memory_reviews, public.memory_sessions, public.public_profiles from anon, authenticated;
grant all on public.subscriptions, public.memory_reviews, public.memory_sessions, public.public_profiles to service_role;

-- Reviews are serialized per user: two tabs/devices cannot overspend the allowance.
create or replace function public.complete_memory_card(p_user_id uuid, p_completion_id uuid, p_card_id text, p_rating text, p_xp integer, p_daily_limit integer, p_session jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
 v_day date := (now() at time zone 'Europe/London')::date;
 v_used integer; v_total integer; v_awarded integer := 0; v_premium boolean; v_existing public.memory_reviews;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
 select count(*) into v_used from memory_reviews where user_id=p_user_id and activity_date=v_day;
 select coalesce(sum(xp),0) into v_total from memory_reviews where user_id=p_user_id;
 select * into v_existing from memory_reviews where user_id=p_user_id and completion_id=p_completion_id;
 if found then return jsonb_build_object('accepted',true,'awarded',v_existing.xp,'used',v_used,'totalXp',v_total); end if;
 select exists(select 1 from subscriptions where user_id=p_user_id and status='active' and current_period_end>now()) into v_premium;
 if not v_premium and v_used >= p_daily_limit then
  return jsonb_build_object('accepted',false,'awarded',0,'used',v_used,'totalXp',v_total);
 end if;
 -- Each distinct source card earns XP once per day, across both directions.
 if not exists(select 1 from memory_reviews where user_id=p_user_id and activity_date=v_day and card_id=p_card_id) then v_awarded := p_xp; end if;
 insert into memory_reviews(user_id,completion_id,card_id,rating,activity_date,xp) values(p_user_id,p_completion_id,p_card_id,p_rating,v_day,v_awarded);
 insert into memory_sessions(user_id,state) values(p_user_id,p_session || jsonb_build_object(
   'sessionXp', (select coalesce(sum(xp),0) from memory_reviews where user_id=p_user_id and completion_id::text in (select jsonb_array_elements_text(p_session->'completionIds'))),
   'completed', (select count(*) from memory_reviews where user_id=p_user_id and completion_id::text in (select jsonb_array_elements_text(p_session->'completionIds')))
 )) on conflict(user_id) do update set state=excluded.state, updated_at=now();
 return jsonb_build_object('accepted',true,'awarded',v_awarded,'used',v_used+1,'totalXp',v_total+v_awarded);
end $$;
revoke all on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,jsonb) to service_role;

create or replace function public.apply_subscription_event(p_user_id uuid, p_event_created bigint, p_subscription_id text, p_status text, p_period_end timestamptz, p_cancel_at_period_end boolean)
returns void language sql security definer set search_path = public as $$
 update subscriptions set subscription_id=p_subscription_id, status=p_status, current_period_end=p_period_end,
 cancel_at_period_end=p_cancel_at_period_end, event_created=p_event_created
 where user_id=p_user_id and event_created <= p_event_created;
$$;
revoke all on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.apply_subscription_event(uuid,bigint,text,text,timestamptz,boolean) to service_role;

-- Chapter bodies must not be readable via a direct public PostgREST call.
-- Public catalogue/reader access is served by the checked server actions.
revoke select on public.chapters from anon, authenticated;

-- Snapshot legacy Memory XP without trusting it for future awards or entitlement.
create table if not exists public.memory_legacy_progress (
 user_id uuid primary key references auth.users(id) on delete cascade, xp bigint not null default 0
);
insert into public.memory_legacy_progress(user_id,xp)
select id, least(1000000000, greatest(0,(raw_user_meta_data->>'memory_xp')::numeric))::bigint
from auth.users where raw_user_meta_data->>'memory_xp' ~ '^\d+(\.\d+)?$'
on conflict(user_id) do nothing;
alter table public.memory_legacy_progress enable row level security;
revoke all on public.memory_legacy_progress from anon, authenticated;
grant all on public.memory_legacy_progress to service_role;

create or replace function public.memory_totals(p_user_id uuid, p_since date default '1970-01-01')
returns jsonb language sql security definer set search_path = public as $$
 select jsonb_build_object('cards',count(*),'xp',coalesce(sum(xp),0)) from memory_reviews where user_id=p_user_id and activity_date>=p_since;
$$;
revoke all on function public.memory_totals(uuid,date) from public, anon, authenticated;
grant execute on function public.memory_totals(uuid,date) to service_role;


grant all on public.learning_profiles, public.learning_activity_daily to service_role;
notify pgrst, 'reload schema';
commit;
