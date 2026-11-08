-- Follow-up to the approved migration. Production duration_seconds is float8,
-- unlike the old numeric test fixture. Keep its private helper signature and cast
-- explicitly at the call site. No content, membership or schema fields change.
create or replace function transcript_private.home_spotlight_is_speech(p_text text,p_translation text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select regexp_replace(coalesce(p_text,''),'\[[^]]*\]','','g') ~ '[ء-يA-Za-z]'
 and not exists (
  select 1 from unnest(array[p_text,p_translation]) value
  where btrim(regexp_replace(lower(coalesce(value,'')),'[^a-zء-ي ]','','g')) ~
   '^(music|intro music|outro music|opening music|closing music|background music|instrumental( music)?|applause|laughter|laughing|silence|silent|sound effects?|sfx|no speech|inaudible|موسيقى|موسيقا|تصفيق|ضحك|صمت|مؤثرات صوتية)$'
 );
$$;
create or replace function transcript_private.home_spotlight_window(p_id uuid,p_position integer,p_start numeric,p_duration numeric,p_allow_source_tokens boolean)
returns jsonb language sql stable security invoker set search_path='' as $$
 with nearby as materialized (
  select s.*,row_number() over(order by position,id) ord,
   lag(position) over(order by position,id) previous_position,
   lag(start_seconds) over(order by position,id) previous_start,
   max(end_seconds) over(order by position,id rows between unbounded preceding and 1 preceding) previous_stop,
   max(end_seconds) over(order by position,id rows unbounded preceding) stop,
   sum(transcript_private.for_you_word_count(original_text,token_data)) over(order by position,id rows unbounded preceding) words
  from (
   select s as original_segment,s.*,case when jsonb_typeof(s.canonical_paragraph->'tokens')='array' and exists(
    select 1 from jsonb_array_elements(case when jsonb_typeof(s.canonical_paragraph->'tokens')='array' then s.canonical_paragraph->'tokens' else '[]'::jsonb end) tok
    where btrim(coalesce(tok->>'arabic',tok->>'ar',tok->>'surface',case when jsonb_typeof(tok)='string' then tok#>>'{}' end,''))<>'')
    then s.canonical_paragraph->'tokens'
    when p_allow_source_tokens then coalesce((select t.raw_transcript->'content'->s.position->'tokens' from public.youtube_transcripts t where t.id=p_id),'[]'::jsonb)
    else '[]'::jsonb end token_data
   from public.transcript_segments s
   where s.transcript_id=p_id and s.position>=p_position and s.position<p_position+256
   order by s.position,s.id limit 256
  ) s
 ), safe as materialized (
  select * from nearby where ord<coalesce((select min(ord) from nearby s where
   not coalesce(transcript_private.for_you_segment_allowed(s.original_segment,p_duration::double precision),false)
   or not transcript_private.home_spotlight_is_speech(s.original_text,s.english_text)
   or s.start_seconds<p_start or s.stop>p_start+60
   or (s.ord=1 and s.position<>p_position)
   or (s.previous_position is not null and s.position<>s.previous_position+1)
   or s.start_seconds<s.previous_start or s.start_seconds>s.previous_stop+3
   or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(s.token_data)='array' then s.token_data else '[]'::jsonb end) tok
    where btrim(coalesce(tok->>'arabic',tok->>'ar',tok->>'surface',case when jsonb_typeof(tok)='string' then tok#>>'{}' end,''))<>'')
   ),257)
  -- Original typed row is required by the existing canonical quality helper.
 ), boundary as (
  select ord,stop from safe where stop-p_start between 30 and 60 and words>=5
   and (select sum(greatest(0,end_seconds-greatest(start_seconds,coalesce(previous_stop,start_seconds)))) from safe covered where covered.ord<=safe.ord)>=.55*(stop-p_start)
  order by (stop-p_start>=40) desc,(btrim(original_text) ~ '[.!?؟۔]["'' )]*$') desc,stop desc,ord limit 1
 )
 select case when exists(select 1 from boundary) then jsonb_build_object(
  'clip_start_ms',round(p_start*1000)::bigint,'clip_end_ms',(select round(stop*1000)::bigint from boundary),
  'segments',(select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'original_text',s.original_text,'english_text',s.english_text,
   'start_seconds',s.start_seconds,'end_seconds',s.end_seconds,'canonical_paragraph',s.canonical_paragraph,'source_tokens',s.token_data) order by s.position,s.id)
   from safe s join boundary b on s.ord<=b.ord)) end;
$$;

create or replace function public.home_for_you_spotlight(p_seed text,p_allow_source_tokens boolean default false)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_source record;v_start record;v_clip jsonb;
 v_attempted integer:=0;v_windows integer:=0;
begin
 if not exists(select 1 from public.transcript_groups where id='5b98c563-5c35-4696-98e1-06aa000eb622') then
  raise exception 'English transcript classification is unavailable';
 end if;
 -- Choose a small, seeded transcript pool FIRST. Windows are derived from the
 -- existing timed paragraphs, never a requirement for pre-cut 30-60s records.
 -- One primary pool (8 sources, 24 starts each); ONE broader/raw-token fallback
 -- (32 sources, 96 starts each). SQL work and network round trips are bounded.
 for v_source in
  with recursive english(id) as (
   select id from public.transcript_groups where id='5b98c563-5c35-4696-98e1-06aa000eb622'
   union select g.id from public.transcript_groups g join english e on g.parent_id=e.id
  )
  select t.id,t.youtube_id,t.title,t.channel,t.duration_seconds
  from public.youtube_transcripts t
  where transcript_private.for_you_source_allowed(t.id)
   and not exists(select 1 from public.admin_manual_transcripts m join english e on e.id=m.group_id where m.transcript_id=t.id)
   and exists(select 1 from public.for_you_candidates c where c.transcript_id=t.id)
  order by md5(t.id::text||left(coalesce(p_seed,''),64))
  limit case when p_allow_source_tokens then 32 else 8 end
 loop
  v_attempted:=v_attempted+1;
  for v_start in
   select c.position,c.start_seconds from public.for_you_candidates c
   where c.transcript_id=v_source.id
   order by md5(c.segment_id::text||left(coalesce(p_seed,''),64))
   limit case when p_allow_source_tokens then 96 else 24 end
  loop
   v_windows:=v_windows+1;
   v_clip:=transcript_private.home_spotlight_window(v_source.id,v_start.position,v_start.start_seconds,v_source.duration_seconds::numeric,p_allow_source_tokens);
   if v_clip is not null then
    return v_clip||jsonb_build_object('video',jsonb_build_object('id',v_source.id,'youtube_id',v_source.youtube_id,'title',v_source.title,'channel',v_source.channel),
     'diagnostics',jsonb_build_object('attempted_transcripts',v_attempted,'attempted_windows',v_windows,'fallback',p_allow_source_tokens));
   end if;
  end loop;
 end loop;
 return null;
end;$$;
revoke all on function transcript_private.home_spotlight_is_speech(text,text) from public,anon,authenticated;
grant execute on function transcript_private.home_spotlight_is_speech(text,text) to service_role;
-- CREATE OR REPLACE preserves the existing service-role-only grants on both
-- the public selector and its window helper.
