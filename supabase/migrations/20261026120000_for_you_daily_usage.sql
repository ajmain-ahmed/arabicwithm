-- Account-backed elapsed For You usage. No XP, billing, or transcript changes.
create table private.website_for_you_daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 activity_date date not null,
 used_ms integer not null default 0 check (used_ms between 0 and 900000),
 lease_id uuid,
 lease_until timestamptz,
 reported_ms bigint not null default 0,
 touched_at timestamptz not null default clock_timestamp(),
 primary key(user_id,activity_date)
);
alter table private.website_for_you_daily enable row level security;
revoke all on private.website_for_you_daily from public,anon,authenticated;
grant select,insert,update on private.website_for_you_daily to service_role;

create function public.website_for_you_usage(p_user_id uuid,p_lease uuid default null,p_total_ms bigint default 0,p_active boolean default false)
returns jsonb language plpgsql set search_path='' as $$
declare
 v_day date := (clock_timestamp() at time zone 'Europe/London')::date;
 v_now timestamptz := clock_timestamp();
 v_row private.website_for_you_daily;
 v_delta integer := 0;
 v_busy boolean := false;
begin
 if p_user_id is null or p_total_ms < 0 or p_total_ms > 2147483647 then raise exception 'Invalid usage request'; end if;
 -- Canonical premium function already includes effective administrator access.
 if private.has_premium(p_user_id) then return jsonb_build_object('unlimited',true,'remainingMs',null,'busy',false,'day',v_day); end if;
 insert into private.website_for_you_daily(user_id,activity_date) values(p_user_id,v_day) on conflict do nothing;
 select * into v_row from private.website_for_you_daily where user_id=p_user_id and activity_date=v_day for update;
 if p_lease is not null then
  if v_row.lease_id=p_lease then
   -- Monotonic cumulative samples make retries idempotent. Never accept more
   -- than real server elapsed time, or a large deferred report after a lost lease.
   v_delta := least(greatest(p_total_ms-v_row.reported_ms,0),5000,
     greatest(0,floor(extract(epoch from(v_now-v_row.touched_at))*1000)::integer));
   v_row.used_ms := least(900000,v_row.used_ms+v_delta);
   v_row.reported_ms := greatest(v_row.reported_ms,p_total_ms);
  elsif v_row.lease_id is not null and v_row.lease_until > v_now then
   v_busy := true;
  else
   v_row.lease_id := p_lease;
   v_row.reported_ms := p_total_ms;
  end if;
  if not v_busy then
   update private.website_for_you_daily set used_ms=v_row.used_ms,
    lease_id=p_lease,lease_until=case when p_active then v_now+interval '6 seconds' else null end,
    reported_ms=v_row.reported_ms,touched_at=v_now where user_id=p_user_id and activity_date=v_day;
  end if;
 end if;
 return jsonb_build_object('unlimited',false,'remainingMs',900000-v_row.used_ms,'busy',v_busy,'day',v_day);
end $$;
revoke all on function public.website_for_you_usage(uuid,uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.website_for_you_usage(uuid,uuid,bigint,boolean) to service_role;
