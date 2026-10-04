create or replace function public.transcript_for_you(
  p_seed text, p_excluded bigint[] default '{}', p_recent uuid[] default '{}', p_limit integer default 5
) returns jsonb language sql stable security invoker set search_path='' as $$
  with sources as materialized (
    select t.id,t.youtube_id,t.title,t.channel,t.thumbnail,t.duration_seconds,t.translation_status,
      a.id anchor_id,a.position anchor_position,a.start_seconds
    from public.youtube_transcripts t
    cross join lateral (
      select s.id,s.position,s.start_seconds from public.transcript_segments s
      where s.transcript_id=t.id and s.start_seconds>=0 and s.end_seconds>s.start_seconds
        and s.end_seconds<=43200 and s.end_seconds-s.start_seconds<=60
        and (t.duration_seconds is null or s.end_seconds<=t.duration_seconds)
        and btrim(s.original_text)<>'' and s.original_text ~ U&'[\0621-\064A]'
        and not (s.id=any(coalesce(p_excluded,'{}')))
      order by (nullif(btrim(s.english_text),'') is null),md5(s.id::text||left(coalesce(p_seed,''),64)),s.id
      limit 16
    ) a
    where t.status='ready' and t.searchable and t.language='ar'
      and t.source_origin='website_admin_transcript'
      and t.episode_id is null
      and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
      and t.source_channel_id is not null
      and coalesce(t.source_channel_id,'')<>'UCS5ZuJQyrkwVHj38iAZdbIQ'
      -- Secondary defence only; positive eligibility always requires provenance.
      and regexp_replace(lower(coalesce(t.channel,'')),'[^a-z0-9]','','g')<>'arabicwithm'
      and t.youtube_id ~ '^[A-Za-z0-9_-]{11}$'
      -- Fail closed on oversized exclusion sets, never silently repeat clips.
      and cardinality(coalesce(p_excluded,'{}'))<=10000
    order by (t.id=any(coalesce(p_recent,'{}'))),
      md5(t.id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),t.id
  ), clips as (
    select t.*,w.segments,w.end_seconds from sources t cross join lateral (
      with nearby as materialized (
        select s.id,s.position,s.original_text,s.english_text,s.start_seconds,s.end_seconds,
          row_number() over(order by s.start_seconds,s.position,s.id) ord,
          max(s.end_seconds) over(order by s.start_seconds,s.position,s.id rows unbounded preceding) stop,
          max(s.end_seconds) over(order by s.start_seconds,s.position,s.id rows between unbounded preceding and 1 preceding) previous_stop
        from (
          select s.id,s.position,s.original_text,s.english_text,s.start_seconds,s.end_seconds
          from public.transcript_segments s
          where s.transcript_id=t.id and (s.start_seconds,s.position,s.id)>=(t.start_seconds,t.anchor_position,t.anchor_id)
            and (s.start_seconds<t.start_seconds+60 or s.id=t.anchor_id)
          order by s.start_seconds,s.position,s.id limit 256
        ) s
      ), safe as (
        select * from nearby where ord < coalesce((
          select min(ord) from nearby where end_seconds<=start_seconds
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
    select distinct on(id) * from clips
    order by id,
      (end_seconds-start_seconds between 15 and 45) desc,
      (end_seconds-start_seconds>=8) desc,
      md5(anchor_id::text||left(coalesce(p_seed,''),64)),anchor_id
  ), batch as (
    select * from varied
    order by (id=any(coalesce(p_recent,'{}'))),
      md5(id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),id
    limit least(greatest(coalesce(p_limit,5),0),5)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'video',jsonb_build_object('id',id,'youtube_id',youtube_id,'title',title,'channel',channel,
      'thumbnail',thumbnail,'duration_seconds',duration_seconds,'status','ready','translation_status',translation_status),
    'clip_start_ms',round(start_seconds::numeric*1000)::bigint,
    'clip_end_ms',round(end_seconds::numeric*1000)::bigint,'segments',segments)
    order by (id=any(coalesce(p_recent,'{}'))),
      md5(id::text||left(coalesce(p_seed,''),64)||cardinality(coalesce(p_excluded,'{}'))::text),id),'[]'::jsonb)
  from batch;
$$;
revoke all on function public.transcript_for_you(text,bigint[],uuid[],integer) from public;
grant execute on function public.transcript_for_you(text,bigint[],uuid[],integer) to anon,authenticated;


