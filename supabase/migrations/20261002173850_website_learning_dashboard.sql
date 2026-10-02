begin;
-- Website-only reads: do not change the session-bound RPC used by other clients.
create function public.website_memory_totals(p_user_id uuid,p_since date default '1970-01-01')
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('cards',count(*),'xp',coalesce(sum(xp),0))
 from public.memory_reviews where user_id=p_user_id and activity_date>=p_since;
$$;
create function public.website_learning_history(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 with activity as (select * from public.learning_activity_daily where user_id=p_user_id),
 memory as (select activity_date,sum(xp) xp,count(*) cards from public.memory_reviews where user_id=p_user_id group by activity_date),
 puzzles as (select activity_date,sum(xp_earned) xp,count(*) puzzles from public.word_search_completions where user_id=p_user_id group by activity_date),
 days as (select activity_date from activity union select activity_date from memory union select activity_date from puzzles),
 timeline as (select d.activity_date as date,coalesce(a.active_seconds,0) as "activeSeconds",coalesce(a.reading_seconds,0) as "readingSeconds",coalesce(a.video_seconds,0) as "videoSeconds",coalesce(a.word_lookups,0) as "wordLookups",coalesce(m.xp,0)+coalesce(p.xp,0) as xp,coalesce(m.cards,0) as "memoryCards",coalesce(p.puzzles,0) as "wordSearches" from days d left join activity a using(activity_date) left join memory m using(activity_date) left join puzzles p using(activity_date))
 select jsonb_build_object(
 'totals',(select jsonb_build_object('readingSeconds',coalesce(sum(reading_seconds),0),'videoSeconds',coalesce(sum(video_seconds),0),'wordLookups',coalesce(sum(word_lookups),0)) from activity),
 'activeDates',coalesce((select jsonb_agg(activity_date order by activity_date) from activity where active_seconds>=60),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(t order by date) from (select * from timeline order by date desc limit 400)t),'[]'::jsonb));
$$;
revoke all on function public.website_memory_totals(uuid,date),public.website_learning_history(uuid) from public,anon,authenticated;
grant execute on function public.website_memory_totals(uuid,date),public.website_learning_history(uuid) to service_role;
notify pgrst,'reload schema';
commit;
