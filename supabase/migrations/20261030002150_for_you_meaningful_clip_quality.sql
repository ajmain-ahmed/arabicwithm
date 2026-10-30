-- Quality is derived at selection time; source transcript wording is untouched.
create function transcript_private.for_you_word_count(p_text text,p_tokens jsonb)
returns integer language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(p_tokens)='array' and jsonb_array_length(p_tokens)>0 then
  (select count(*)::integer from jsonb_array_elements(p_tokens) token
   where coalesce(token->>'arabic',token->>'ar',token->>'surface',case when jsonb_typeof(token)='string' then token#>>'{}' end,'') ~ '[ء-ي]')
 else
  (select count(*)::integer from regexp_split_to_table(coalesce(p_text,''),'[[:space:]]+') word where word ~ '[ء-ي]')
 end;
$$;
revoke all on function transcript_private.for_you_word_count(text,jsonb) from public,anon,authenticated;
grant execute on function transcript_private.for_you_word_count(text,jsonb) to service_role;
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
          sum(s.meaningful_words) over(order by s.start_seconds,s.position,s.id rows unbounded preceding) words,
          max(s.end_seconds) over(order by s.start_seconds,s.position,s.id rows between unbounded preceding and 1 preceding) previous_stop
        from (
          select s.id,s.position,s.original_text,s.english_text,s.for_you_manual_excluded,s.for_you_music_only,s.for_you_theme_score,s.start_seconds,s.end_seconds,
            transcript_private.for_you_word_count(s.original_text,
              case when jsonb_typeof(s.canonical_paragraph->'tokens')='array' and jsonb_array_length(s.canonical_paragraph->'tokens')>0
                then s.canonical_paragraph->'tokens'
                else (select rt.raw_transcript->'content'->s.position->'tokens' from public.youtube_transcripts rt where rt.id=s.transcript_id) end) meaningful_words
          from public.transcript_segments s
          where s.transcript_id=t.id and (s.start_seconds,s.position,s.id)>=(t.start_seconds,t.anchor_position,t.anchor_id)
            and (s.start_seconds<t.start_seconds+60 or s.id=t.anchor_id)
          order by s.start_seconds,s.position,s.id limit 256
        ) s
      ), safe as (
        select * from nearby where ord < coalesce((
          select min(ord) from nearby where id=any(coalesce(p_excluded,'{}')) or for_you_manual_excluded or for_you_music_only or for_you_theme_score>=0.9 or start_seconds is null or end_seconds is null or end_seconds<=start_seconds
            or btrim(original_text)='' or original_text !~ '[ء-ي]'
            or (t.duration_seconds is not null and end_seconds>t.duration_seconds)
            or start_seconds>previous_stop+2
            -- Never split a caption without word timings or cross the hard maximum.
            or stop>t.start_seconds+60 or end_seconds>43200
        ),257)
      ), boundary as (
        select ord,stop from safe
        where stop-t.start_seconds between 10 and 60 and words>=5
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

