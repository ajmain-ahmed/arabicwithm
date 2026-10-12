-- Canonical access: paid subscription OR manual grant OR existing administrator inclusion.
-- All new APIs are service-role only; Server Actions verify identity/role first.
begin;
create table private.manual_premium_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 changed_by uuid references auth.users(id) on delete set null,
 reason text not null check(length(reason) between 1 and 2000),
 updated_at timestamptz not null default now()
);
create table private.manual_premium_audit (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 enabled boolean not null, changed_by uuid references auth.users(id) on delete set null,
 reason text not null, changed_at timestamptz not null default now()
);
alter table private.manual_premium_grants enable row level security;
alter table private.manual_premium_audit enable row level security;
revoke all on private.manual_premium_grants,private.manual_premium_audit from public,anon,authenticated;
grant select,insert,update,delete on private.manual_premium_grants,private.manual_premium_audit to service_role;
grant usage on schema private to service_role;
create function private.has_premium(p_user_id uuid) returns boolean language sql stable set search_path='' as $$
 select public.account_role(p_user_id)='admin'
 or exists(select 1 from private.manual_premium_grants where user_id=p_user_id and enabled)
 or exists(select 1 from public.subscriptions where user_id=p_user_id and status in ('active','trialing') and current_period_end>now());
$$;
create function public.account_has_premium(p_user_id uuid) returns boolean language sql stable set search_path='' as $$ select private.has_premium(p_user_id); $$;
create function public.admin_set_manual_premium(p_actor uuid,p_target uuid,p_enabled boolean,p_reason text) returns boolean language plpgsql set search_path='' as $$
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_enabled is null or length(btrim(p_reason)) not between 1 and 2000 then raise exception 'Reason required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 insert into private.manual_premium_grants(user_id,enabled,changed_by,reason) values(p_target,p_enabled,p_actor,btrim(p_reason))
 on conflict(user_id) do update set enabled=excluded.enabled,changed_by=excluded.changed_by,reason=excluded.reason,updated_at=now();
 insert into private.manual_premium_audit(user_id,enabled,changed_by,reason) values(p_target,p_enabled,p_actor,btrim(p_reason));
 return private.has_premium(p_target);
end $$;
create function public.admin_manual_premium_details(p_actor uuid,p_target uuid) returns jsonb language plpgsql set search_path='' as $$
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 return jsonb_build_object('enabled',coalesce((select enabled from private.manual_premium_grants where user_id=p_target),false),
 'history',coalesce((select jsonb_agg(x) from (select enabled,reason,changed_by,changed_at from private.manual_premium_audit where user_id=p_target order by changed_at desc limit 100)x),'[]'::jsonb));
end $$;

-- Separate start ledger extends the existing latest-session snapshot and card review history.
create table private.website_memory_starts (
 session_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 activity_date date not null default (now() at time zone 'Europe/London')::date,
 state jsonb not null, started_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index website_memory_user_day on private.website_memory_starts(user_id,activity_date);
alter table private.website_memory_starts enable row level security;
revoke all on private.website_memory_starts from public,anon,authenticated;
grant select,insert,update,delete on private.website_memory_starts to service_role;
create function public.website_memory_session_usage(p_user_id uuid) returns integer language sql stable set search_path='' as $$
 select count(*)::integer from private.website_memory_starts where user_id=p_user_id and activity_date=(now() at time zone 'Europe/London')::date;
$$;
create function public.website_begin_memory_session(p_user_id uuid,p_state jsonb) returns jsonb language plpgsql set search_path='' as $$
declare v_id uuid := (p_state->>'sessionId')::uuid; v_existing private.website_memory_starts; v_used integer; v_count integer;
begin
 if v_id is null or p_user_id is null then raise exception 'Session identity required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into v_existing from private.website_memory_starts where session_id=v_id;
 if found then
  if v_existing.user_id<>p_user_id then raise exception 'Forbidden'; end if;
  return jsonb_build_object('accepted',true,'state',v_existing.state,'used',public.website_memory_session_usage(p_user_id));
 end if;
 v_used:=public.website_memory_session_usage(p_user_id);
 if not private.has_premium(p_user_id) and v_used>=1 then return jsonb_build_object('accepted',false,'used',v_used); end if;
 v_count:=jsonb_array_length(p_state->'cards');
 if v_count is null or v_count not between 1 and 50 or jsonb_array_length(p_state->'completionIds')<>v_count
 or (p_state->>'index')::integer<>0 or (p_state->>'completed')::integer<>0 or (p_state->>'sessionXp')::integer<>0
 or (select count(distinct value) from jsonb_array_elements_text(p_state->'completionIds'))<>v_count
 or (select count(distinct value->>'id') from jsonb_array_elements(p_state->'cards'))<>v_count
 then raise exception 'Invalid session queue'; end if;
 insert into private.website_memory_starts(session_id,user_id,state) values(v_id,p_user_id,p_state);
 insert into public.memory_sessions(user_id,state) values(p_user_id,p_state) on conflict(user_id) do update set state=excluded.state,updated_at=now();
 return jsonb_build_object('accepted',true,'state',p_state,'used',v_used+1);
end $$;
create function public.website_save_memory_session(p_user_id uuid,p_state jsonb) returns jsonb language plpgsql set search_path='' as $$
declare v_existing private.website_memory_starts; v_state jsonb; v_index integer := (p_state->>'index')::integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into v_existing from private.website_memory_starts where session_id=(p_state->>'sessionId')::uuid and user_id=p_user_id;
 if not found then raise exception 'Start this session first'; end if;
 if p_state->'cards' is distinct from v_existing.state->'cards' or p_state->'completionIds' is distinct from v_existing.state->'completionIds'
 or v_index is null or v_index<(v_existing.state->>'index')::integer or v_index>jsonb_array_length(p_state->'cards')
 then raise exception 'Invalid session progress'; end if;
 v_state:=p_state || jsonb_build_object('completed',(select count(*) from public.memory_reviews where user_id=p_user_id and completion_id::text in(select jsonb_array_elements_text(p_state->'completionIds'))),
 'sessionXp',(select coalesce(sum(xp),0) from public.memory_reviews where user_id=p_user_id and completion_id::text in(select jsonb_array_elements_text(p_state->'completionIds'))));
 update private.website_memory_starts set state=v_state,updated_at=now() where session_id=v_existing.session_id;
 insert into public.memory_sessions(user_id,state) values(p_user_id,v_state) on conflict(user_id) do update set state=excluded.state,updated_at=now();
 return v_state;
end $$;
create function public.website_complete_memory_card_v2(p_user_id uuid,p_completion_id uuid,p_card_id text,p_rating text,p_session jsonb) returns jsonb language plpgsql set search_path='' as $$
declare v_existing private.website_memory_starts; v_review public.memory_reviews; v_xp integer:=0;
 v_day date:=(now() at time zone 'Europe/London')::date; v_index integer:=(p_session->>'index')::integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into v_existing from private.website_memory_starts where session_id=(p_session->>'sessionId')::uuid and user_id=p_user_id;
 if not found then raise exception 'Start this session first'; end if;
 if p_rating is null or p_rating not in ('again','known') or v_index is null or v_index<1
 or p_session->'cards' is distinct from v_existing.state->'cards' or p_session->'completionIds' is distinct from v_existing.state->'completionIds'
 or p_session->'cards'->(v_index-1)->>'id' is distinct from p_card_id
 or p_session->'completionIds'->>(v_index-1) is distinct from p_completion_id::text
 then raise exception 'Invalid session review'; end if;
 select * into v_review from public.memory_reviews where user_id=p_user_id and completion_id=p_completion_id;
 if found then v_xp:=v_review.xp;
 else
  if v_index<(v_existing.state->>'index')::integer then raise exception 'Invalid session progress'; end if;
  if not exists(select 1 from public.memory_reviews where user_id=p_user_id and activity_date=v_day and card_id=p_card_id)
   then v_xp:=case when p_rating='known' then 5 else 1 end; end if;
  insert into public.memory_reviews(user_id,completion_id,card_id,rating,activity_date,xp) values(p_user_id,p_completion_id,p_card_id,p_rating,v_day,v_xp);
  perform public.website_save_memory_session(p_user_id,p_session);
 end if;
 return jsonb_build_object('accepted',true,'awarded',v_xp,'used',public.website_memory_session_usage(p_user_id),
 'totalXp',(select coalesce(sum(xp),0) from public.memory_reviews where user_id=p_user_id));
end $$;
-- Reading requires authentication even through direct REST; Explore uses its controlled service layer.
revoke select on public.chapters from anon;
-- Restrict every new function, including helper functions, in the same transaction.
revoke all on function private.has_premium(uuid), public.account_has_premium(uuid), public.admin_set_manual_premium(uuid,uuid,boolean,text), public.admin_manual_premium_details(uuid,uuid), public.website_memory_session_usage(uuid), public.website_begin_memory_session(uuid,jsonb), public.website_save_memory_session(uuid,jsonb), public.website_complete_memory_card_v2(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.has_premium(uuid), public.account_has_premium(uuid), public.admin_set_manual_premium(uuid,uuid,boolean,text), public.admin_manual_premium_details(uuid,uuid), public.website_memory_session_usage(uuid), public.website_begin_memory_session(uuid,jsonb), public.website_save_memory_session(uuid,jsonb), public.website_complete_memory_card_v2(uuid,uuid,text,text,jsonb) to service_role;
notify pgrst,'reload schema';
CREATE OR REPLACE FUNCTION private.admin_user_directory(p_actor uuid, p_tab text, p_search text, p_page integer, p_size integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_tab not in ('all','premium','editor','admin') or p_page<0 or p_size not between 1 and 100 or length(p_search)>200 then raise exception 'Invalid directory request'; end if;
 with accounts as (
 select u.id, u.email,coalesce(nullif(p.display_name,''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Arabic learner') as name,
 u.raw_user_meta_data->>'avatar_url' as avatar,u.created_at as joined,u.last_sign_in_at as last_sign_in,
 coalesce(r.role,'user') as role,
 coalesce((select enabled from private.manual_premium_grants where user_id=u.id),false) as manual_premium,
 coalesce(s.status in ('active','trialing') and s.current_period_end>now(),false) as paid_premium,
 private.has_premium(u.id) as premium,
 s.status as subscription_status,s.current_period_end,s.cancel_at_period_end,u.banned_until
 from auth.users u left join public.account_roles r on r.user_id=u.id left join public.public_profiles p on p.user_id=u.id left join public.subscriptions s on s.user_id=u.id
 where not coalesce(u.is_anonymous,false)
 ), filtered as (select * from accounts where (p_tab='all' or (p_tab='premium' and premium) or role=p_tab)
 and (strpos(lower(name),lower(p_search))>0 or strpos(lower(coalesce(email,'')),lower(p_search))>0))
 select jsonb_build_object('total',(select count(*) from filtered),'counts',(select jsonb_build_object('all',count(*),'premium',count(*) filter(where premium),'editor',count(*) filter(where role='editor'),'admin',count(*) filter(where role='admin')) from accounts),
 'users',coalesce((select jsonb_agg(x) from (select f.*,
 (select jsonb_object_agg(status,n) from (select status,count(*) n from public.content_suggestions where author_id=f.id group by status)a) as activity
 from (select * from filtered order by joined desc,id limit p_size offset p_page*p_size)f)x),'[]'::jsonb)) into result;
 return result;
end $function$;

commit;
