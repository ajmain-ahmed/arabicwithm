begin;
-- Keep the function signature for old clients; p_xp no longer awards points.
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
 if found then return jsonb_build_object('accepted',true,'awarded',0,'used',v_used,'totalXp',v_total); end if;
 select exists(select 1 from subscriptions where user_id=p_user_id and status='active' and current_period_end>now()) into v_premium;
 if not v_premium and v_used >= p_daily_limit then
  return jsonb_build_object('accepted',false,'awarded',0,'used',v_used,'totalXp',v_total);
 end if;
 -- Memory records practice only; ignore legacy callers requesting XP.
 insert into memory_reviews(user_id,completion_id,card_id,rating,activity_date,xp) values(p_user_id,p_completion_id,p_card_id,p_rating,v_day,v_awarded);
 insert into memory_sessions(user_id,state) values(p_user_id,p_session || jsonb_build_object(
   'sessionXp', 0,
   'completed', (select count(*) from memory_reviews where user_id=p_user_id and completion_id::text in (select jsonb_array_elements_text(p_session->'completionIds')))
 )) on conflict(user_id) do update set state=excluded.state, updated_at=now();
 return jsonb_build_object('accepted',true,'awarded',v_awarded,'used',v_used+1,'totalXp',v_total+v_awarded);
end $$;
revoke all on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.complete_memory_card(uuid,uuid,text,text,integer,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
