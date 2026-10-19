-- For You efficiency: cache the eligible-segment scan (refreshed every few
-- minutes) so per-request work is a small shuffle over cached rows instead of
-- scanning/joining all transcripts+segments. The RPC also returns the raw
-- source tokens for the selected segments, so the app no longer pulls full
-- raw transcripts (~52 KB each) per batch.

create table if not exists public.for_you_candidates (
  segment_id bigint primary key references public.transcript_segments (id) on delete cascade,
  transcript_id uuid not null references public.youtube_transcripts (id) on delete cascade,
  position integer not null,
  start_seconds numeric not null
);

create index if not exists for_you_candidates_transcript_idx on public.for_you_candidates (transcript_id);

create table if not exists public.for_you_cache_state (
  id boolean primary key default true check (id),
  refreshed_at timestamptz not null default now()
);

revoke all on public.for_you_candidates from anon, authenticated;
revoke all on public.for_you_cache_state from anon, authenticated;

create or replace function public.transcript_for_you_groups(p_seed text, p_excluded bigint[] DEFAULT '{}'::bigint[], p_recent uuid[] DEFAULT '{}'::uuid[], p_limit integer DEFAULT 5, p_group_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (select 1 from public.for_you_cache_state where refreshed_at > now() - interval '5 minutes')
     or not exists (select 1 from public.for_you_candidates) then
    -- Non-blocking: a concurrent refresher (or a failed refresh) must never
    -- fail the request — stale candidates are served instead.
    if pg_try_advisory_lock(727272) then
      begin
        if not exists (select 1 from public.for_you_cache_state where refreshed_at > now() - interval '5 minutes')
           or not exists (select 1 from public.for_you_candidates) then
      delete from public.for_you_candidates;
      insert into public.for_you_candidates (transcript_id, segment_id, position, start_seconds)
        select t.id, s.id, s.position, s.start_seconds
        from public.youtube_transcripts t
        join public.transcript_segments s on s.transcript_id=t.id
        where t.status='ready' and t.explore_published and t.language='ar'
          and t.source_origin='website_admin_transcript'
          and t.episode_id is null
          and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
          -- Manual Admin uploads may lack channel IDs; provenance is authoritative.
          and coalesce(t.source_channel_id,'')<>'UCS5ZuJQyrkwVHj38iAZdbIQ'
          -- Secondary defence only; positive eligibility always requires provenance.
          and regexp_replace(lower(coalesce(t.channel,'')),'[^a-z0-9]','','g')<>'arabicwithm'
          and t.youtube_id ~ '^[A-Za-z0-9_-]{11}$'
          and not s.for_you_manual_excluded and not s.for_you_music_only and s.for_you_theme_score<0.9
          and s.start_seconds>=0 and s.end_seconds>s.start_seconds
          and s.end_seconds<=43200 and s.end_seconds-s.start_seconds<=60
          and (t.duration_seconds is null or s.end_seconds<=t.duration_seconds)
          and btrim(s.original_text)<>'' and s.original_text ~ U&'[\0621-\064A]';
          insert into public.for_you_cache_state (id, refreshed_at) values (true, now())
            on conflict (id) do update set refreshed_at=excluded.refreshed_at;
        end if;
      exception when others then
        null;
      end;
      perform pg_advisory_unlock(727272);
    end if;
  end if;

  return public.transcript_for_you_groups_impl(p_seed, p_excluded, p_recent, p_limit, p_group_ids);
end;
$function$;

-- Selection core (renamed from the original function).
create or replace function public.transcript_for_you_groups_impl(p_seed text, p_excluded bigint[] DEFAULT '{}'::bigint[], p_recent uuid[] DEFAULT '{}'::uuid[], p_limit integer DEFAULT 5, p_group_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
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
          select min(ord) from nearby where for_you_manual_excluded or for_you_music_only or for_you_theme_score>=0.9 or end_seconds<=start_seconds
            or btrim(original_text)='' or original_text !~ U&'[\0621-\064A]'
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
              and tail.original_text ~ U&'[\0621-\064A]' and btrim(tail.original_text)<>'')
        order by
          -- Completed thoughts win, then prefer 15-45s and proximity to 30s.
          (btrim(original_text) ~ U&'[.!?\061F\06D4]["'' )]*$' and stop-t.start_seconds>=15) desc,
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
