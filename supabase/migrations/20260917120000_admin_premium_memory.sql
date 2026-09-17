-- Let the verified application entitlement bypass the free Memory Practice cap.
-- The function remains service-role only, so clients cannot grant this flag to themselves.
begin;

drop function if exists public.complete_memory_card(uuid,uuid,text,text,integer,integer,jsonb);
drop function if exists public.complete_memory_card(uuid,uuid,text,text,integer,integer,boolean,jsonb);

create function public.complete_memory_card(
  p_user_id uuid,
  p_completion_id uuid,
  p_card_id text,
  p_rating text,
  p_xp integer,
  p_daily_limit integer,
  p_has_premium boolean,
  p_session jsonb
)
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
 select coalesce(p_has_premium, false) or exists(
   select 1 from subscriptions where user_id=p_user_id and status='active' and current_period_end>now()
 ) into v_premium;
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

revoke all on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,boolean,jsonb) to service_role;
notify pgrst, 'reload schema';

commit;
