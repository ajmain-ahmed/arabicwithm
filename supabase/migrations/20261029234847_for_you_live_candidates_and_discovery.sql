-- Live, lightweight candidates. Publication never depends on a timed cache rebuild.
create or replace function transcript_private.for_you_source_allowed(p_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select t.status='ready' and t.explore_published and t.language='ar'
 and t.source_origin='website_admin_transcript' and t.episode_id is null
 and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
 and coalesce(t.source_channel_id,'')<>'UCS5ZuJQyrkwVHj38iAZdbIQ'
 and regexp_replace(lower(coalesce(t.channel,'')),'[^a-z0-9]','','g')<>'arabicwithm'
 and t.youtube_id ~ '^[A-Za-z0-9_-]{11}$' from public.youtube_transcripts t where t.id=p_id;
$$;
create or replace function transcript_private.for_you_segment_allowed(s public.transcript_segments,p_duration double precision)
returns boolean language sql immutable security invoker set search_path='' as $$
 select not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<0.9
 and s.start_seconds>=0 and s.end_seconds>s.start_seconds and s.end_seconds<=43200
 and s.end_seconds-s.start_seconds<=60 and (p_duration is null or s.end_seconds<=p_duration)
 and btrim(s.original_text)<>'' and s.original_text ~ '[ء-ي]';
$$;
create or replace function transcript_private.refresh_for_you_source(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.for_you_candidates c where c.transcript_id=p_id and not exists(
  select 1 from public.transcript_segments s join public.youtube_transcripts t on t.id=s.transcript_id
  where s.id=c.segment_id and transcript_private.for_you_source_allowed(t.id) and transcript_private.for_you_segment_allowed(s,t.duration_seconds));
 insert into public.for_you_candidates(segment_id,transcript_id,position,start_seconds)
 select s.id,s.transcript_id,s.position,s.start_seconds from public.transcript_segments s
 join public.youtube_transcripts t on t.id=s.transcript_id where t.id=p_id
 and transcript_private.for_you_source_allowed(t.id) and transcript_private.for_you_segment_allowed(s,t.duration_seconds)
 on conflict(segment_id) do update set transcript_id=excluded.transcript_id,position=excluded.position,start_seconds=excluded.start_seconds;
end;$$;
create or replace function transcript_private.sync_for_you_segment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.youtube_transcripts t where t.id=new.transcript_id
  and transcript_private.for_you_source_allowed(t.id) and transcript_private.for_you_segment_allowed(new,t.duration_seconds)) then
  insert into public.for_you_candidates(segment_id,transcript_id,position,start_seconds)
  values(new.id,new.transcript_id,new.position,new.start_seconds)
  on conflict(segment_id) do update set transcript_id=excluded.transcript_id,position=excluded.position,start_seconds=excluded.start_seconds;
 else delete from public.for_you_candidates where segment_id=new.id;end if;
 return new;
end;$$;
create trigger sync_for_you_segment after insert or update of transcript_id,position,start_seconds,end_seconds,original_text,for_you_manual_excluded,for_you_music_only,for_you_theme_score
on public.transcript_segments for each row execute function transcript_private.sync_for_you_segment();
create or replace function transcript_private.sync_for_you_source()
returns trigger language plpgsql security definer set search_path='' as $$
begin perform transcript_private.refresh_for_you_source(new.id);return new;end;$$;
create trigger sync_for_you_source after insert or update of status,explore_published,language,source_origin,episode_id,source_channel_id,channel,youtube_id,duration_seconds
on public.youtube_transcripts for each row execute function transcript_private.sync_for_you_source();
create or replace function transcript_private.sync_for_you_episode()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 for v_id in select id from public.youtube_transcripts where youtube_id in
 (case when tg_op<>'INSERT' then old.youtube_id end,case when tg_op<>'DELETE' then new.youtube_id end)
 loop perform transcript_private.refresh_for_you_source(v_id);end loop;
 return null;
end;$$;
create trigger sync_for_you_episode after insert or update of youtube_id or delete on public.episodes
for each row execute function transcript_private.sync_for_you_episode();

-- One repair/backfill of the old five-source snapshot; no transcript content is modified.
delete from public.for_you_candidates c where not exists(select 1 from public.transcript_segments s join public.youtube_transcripts t on t.id=s.transcript_id
 where s.id=c.segment_id and transcript_private.for_you_source_allowed(t.id) and transcript_private.for_you_segment_allowed(s,t.duration_seconds));
insert into public.for_you_candidates(segment_id,transcript_id,position,start_seconds)
select s.id,s.transcript_id,s.position,s.start_seconds from public.transcript_segments s join public.youtube_transcripts t on t.id=s.transcript_id
where transcript_private.for_you_source_allowed(t.id) and transcript_private.for_you_segment_allowed(s,t.duration_seconds)
on conflict(segment_id) do update set transcript_id=excluded.transcript_id,position=excluded.position,start_seconds=excluded.start_seconds;

create or replace function public.transcript_for_you_groups(p_seed text,p_excluded bigint[] default '{}',p_recent uuid[] default '{}',p_limit integer default 5,p_group_ids uuid[] default '{}')
returns jsonb language sql volatile security invoker set search_path='' as $$
 select public.transcript_for_you_groups_impl(p_seed,p_excluded,p_recent,p_limit,p_group_ids);
$$;
create or replace function public.transcript_for_you_groups_impl(p_seed text, p_excluded bigint[] DEFAULT '{}'::bigint[], p_recent uuid[] DEFAULT '{}'::uuid[], p_limit integer DEFAULT 5, p_group_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  result jsonb;
begin

  with recursive selected_groups(id) as (
    select g.id from public.transcript_groups g where g.id=any(coalesce(p_group_ids,'{}'))
    union
    select g.id from public.transcript_groups g join selected_groups p on g.parent_id=p.id
  ), sources as materialized (
    select t.id,t.youtube_id,t.title,t.channel,t.thumbnail,t.duration_seconds,t.translation_status,
      a.segment_id anchor_id,a.position anchor_position,a.start_seconds
    from public.youtube_transcripts t
    cross join lateral (
      select c.segment_id,c.position,c.start_seconds
      from public.for_you_candidates c
      join public.transcript_segments s on s.id=c.segment_id
      where c.transcript_id=t.id
        and not (c.segment_id=any(coalesce(p_excluded,'{}')))
        and transcript_private.for_you_segment_allowed(s,t.duration_seconds)
      order by (nullif(btrim(s.english_text),'') is null),md5(c.segment_id::text||left(coalesce(p_seed,''),64)),c.segment_id
      limit 16
    ) a
    where (cardinality(coalesce(p_group_ids,'{}'))=0 or exists (
      select 1 from public.admin_manual_transcripts m join selected_groups g on g.id=m.group_id where m.transcript_id=t.id
    )) and t.status='ready' and t.explore_published and t.language='ar'
      and t.source_origin='website_admin_transcript'
      and t.episode_id is null
      and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
      and coalesce(t.source_channel_id,'')<>'UCS5ZuJQyrkwVHj38iAZdbIQ'
      and regexp_replace(lower(coalesce(t.channel,'')),'[^a-z0-9]','','g')<>'arabicwithm'
      and t.youtube_id ~ '^[A-Za-z0-9_-]{11}$'
      -- Fail closed on oversized exclusion sets, never silently repeat clips.
      and cardinality(coalesce(p_excluded,'{}'))<=10000
    order by (t.id=any(coalesce(p_recent,'{}'))),
      md5(t.id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),t.id
  ), clips as (
    select t.*,w.segments,w.end_seconds from sources t cross join lateral (
      with nearby as materialized (
        select s.id,s.position,s.original_text,s.english_text,s.for_you_manual_excluded,s.for_you_music_only,s.for_you_theme_score,s.start_seconds,s.end_seconds,
          row_number() over(order by s.start_seconds,s.position,s.id) ord,
          max(s.end_seconds) over(order by s.start_seconds,s.position,s.id rows unbounded preceding) stop,
          max(s.end_seconds) over(order by s.start_seconds,s.position,s.id rows between unbounded preceding and 1 preceding) previous_stop
        from (
          select s.id,s.position,s.original_text,s.english_text,s.for_you_manual_excluded,s.for_you_music_only,s.for_you_theme_score,s.start_seconds,s.end_seconds
          from public.transcript_segments s
          where s.transcript_id=t.id and (s.start_seconds,s.position,s.id)>=(t.start_seconds,t.anchor_position,t.anchor_id)
            and (s.start_seconds<t.start_seconds+60 or s.id=t.anchor_id)
          order by s.start_seconds,s.position,s.id limit 256
        ) s
      ), safe as (
        select * from nearby where ord < coalesce((
          select min(ord) from nearby where id=any(coalesce(p_excluded,'{}')) or for_you_manual_excluded or for_you_music_only or for_you_theme_score>=0.9 or end_seconds<=start_seconds
            or btrim(original_text)='' or original_text !~ '[ء-ي]'
            or (t.duration_seconds is not null and end_seconds>t.duration_seconds)
            or start_seconds>previous_stop+2
            -- Never split a caption without word timings or cross the hard maximum.
            or stop>t.start_seconds+60 or end_seconds>43200
        ),257)
      ), boundary as (
        select ord,stop from safe
        where stop-t.start_seconds>=8
          or not exists(select 1 from public.transcript_segments tail
            where tail.transcript_id=t.id and tail.end_seconds>stop
              and tail.end_seconds>tail.start_seconds and tail.start_seconds>=0
              and tail.end_seconds<=43200
              and (t.duration_seconds is null or tail.end_seconds<=t.duration_seconds)
              and tail.original_text ~ '[ء-ي]' and btrim(tail.original_text)<>'')
        order by
          -- Completed thoughts win, then prefer 15-45s and proximity to 30s.
          (btrim(original_text) ~ '[.!?؟۔]["'' )]*$' and stop-t.start_seconds>=15) desc,
          (stop-t.start_seconds between 15 and 45) desc,
          (stop-t.start_seconds>=15) desc,
          abs(stop-t.start_seconds-30),ord limit 1
      )
      select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,
        'original_text',s.original_text,'english_text',s.english_text,
        'start_seconds',s.start_seconds,'end_seconds',s.end_seconds)
        order by s.start_seconds,s.position,s.id) segments,max(b.stop) end_seconds
      from safe s join boundary b on s.ord<=b.ord
    ) w where w.segments is not null
  ), varied as (
    select distinct on(youtube_id) * from clips
    order by youtube_id,
      (end_seconds-start_seconds between 15 and 45) desc,
      (end_seconds-start_seconds>=8) desc,
      md5(anchor_id::text||left(coalesce(p_seed,''),64)),anchor_id
  ), batch as (
    select * from varied
    order by (id=coalesce(p_recent[1], '00000000-0000-0000-0000-000000000000'::uuid)),
      (id=any(coalesce(p_recent,'{}'))),
      md5(id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),id
    limit least(greatest(coalesce(p_limit,5),0),5)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'video',jsonb_build_object('id',id,'youtube_id',youtube_id,'title',title,'channel',channel,
      'thumbnail',thumbnail,'duration_seconds',duration_seconds,'status','ready','translation_status',translation_status),
    'clip_start_ms',round(start_seconds::numeric*1000)::bigint,
    'clip_end_ms',round(end_seconds::numeric*1000)::bigint,'segments',(select jsonb_agg(e.segment||jsonb_build_object('canonical_paragraph',h.canonical_paragraph,'for_you_fingerprints',h.for_you_fingerprints,'source_tokens',coalesce((select rt.raw_transcript->'content'->((e.segment->>'position')::int)->'tokens' from public.youtube_transcripts rt where rt.id=batch.id),'[]'::jsonb)) order by e.ord)
     from jsonb_array_elements(segments) with ordinality e(segment,ord)
     join public.transcript_segments h on h.id=(e.segment->>'id')::bigint))
    order by (id=coalesce(p_recent[1], '00000000-0000-0000-0000-000000000000'::uuid)),
      (id=any(coalesce(p_recent,'{}'))),
      md5(id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),id),'[]'::jsonb)
  from batch
  into result;

  return result;
end;
$function$;

-- Server actions validate sign-in; privileged data functions are service-only.
revoke all on function public.transcript_for_you_groups(text,bigint[],uuid[],integer,uuid[]) from public,anon,authenticated;
revoke all on function public.transcript_for_you_groups_impl(text,bigint[],uuid[],integer,uuid[]) from public,anon,authenticated;
grant execute on function public.transcript_for_you_groups(text,bigint[],uuid[],integer,uuid[]),public.transcript_for_you_groups_impl(text,bigint[],uuid[],integer,uuid[]) to service_role;
revoke all on function transcript_private.refresh_for_you_source(uuid),transcript_private.sync_for_you_segment(),transcript_private.sync_for_you_source(),transcript_private.sync_for_you_episode(),transcript_private.for_you_source_allowed(uuid),transcript_private.for_you_segment_allowed(public.transcript_segments,double precision) from public,anon,authenticated;
grant usage on schema transcript_private to service_role;
grant execute on function transcript_private.for_you_source_allowed(uuid),transcript_private.for_you_segment_allowed(public.transcript_segments,double precision) to service_role;
alter table public.for_you_candidates enable row level security;
alter table public.for_you_cache_state enable row level security;

-- Read-only, Admin-facing explanation of the canonical eligibility boundary.
create function public.website_for_you_diagnostics() returns jsonb
language sql stable security invoker set search_path='' as $$
 with sources as (
  select t.id,t.title,t.youtube_id,t.status,t.explore_published,t.error_code,
   transcript_private.for_you_source_allowed(t.id) source_allowed,
   array_remove(array[
    case when not t.explore_published then 'Publish to For You is off' end,
    case when t.status<>'ready' then 'Transcript is not ready: '||t.status end,
    case when t.language<>'ar' then 'Non-Arabic source' end,
    case when t.episode_id is not null or exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id) then 'Managed in Shows/Episodes' end,
    case when coalesce(t.source_channel_id,'')='UCS5ZuJQyrkwVHj38iAZdbIQ' or regexp_replace(lower(coalesce(t.channel,'')),'[^a-z0-9]','','g')='arabicwithm' then 'Excluded website channel' end,
    case when t.youtube_id is null or t.youtube_id !~ '^[A-Za-z0-9_-]{11}$' then 'Missing or invalid video ID' end
   ],null) reasons,
   (select count(*) from public.transcript_segments s where s.transcript_id=t.id) segments,
   (select count(*) from public.transcript_segments s where s.transcript_id=t.id and transcript_private.for_you_segment_allowed(s,t.duration_seconds)) valid_segments,
   (select count(*) from public.transcript_segments s where s.transcript_id=t.id and (s.for_you_manual_excluded or s.for_you_music_only or s.for_you_theme_score>=.9)) excluded_segments,
   (select count(*) from public.transcript_segments s where s.transcript_id=t.id and not transcript_private.for_you_segment_allowed(s,t.duration_seconds) and not(s.for_you_manual_excluded or s.for_you_music_only or s.for_you_theme_score>=.9)) invalid_segments
  from public.youtube_transcripts t where t.source_origin='website_admin_transcript'
 ) select jsonb_build_object(
  'totalTranscripts',(select count(*) from public.youtube_transcripts),
  'adminTranscripts',count(*),
  'publishedTranscripts',count(*) filter(where explore_published),
  'eligibleTranscripts',count(*) filter(where source_allowed and valid_segments>0),
  'eligibleSegments',(select count(*) from public.for_you_candidates),
  'uniqueVideos',count(distinct youtube_id) filter(where source_allowed and valid_segments>0),
  'sources',coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'youtubeId',youtube_id,'published',explore_published,'eligibleSegments',case when source_allowed then valid_segments else 0 end,'excludedSegments',excluded_segments,'invalidSegments',invalid_segments,'errorCode',error_code,
    'reasons',to_jsonb(reasons)||case when segments=0 then '["No indexed segments"]'::jsonb when valid_segments=0 then '["No eligible timing/text segments remain"]'::jsonb else '[]'::jsonb end) order by title),'[]'::jsonb)
 ) from sources;
$$;
revoke all on function public.website_for_you_diagnostics() from public,anon,authenticated;
grant execute on function public.website_for_you_diagnostics() to service_role;
