-- Homepage-only selection. Existing feed RPCs, candidate maintenance and data are unchanged.
-- Uses the live canonical candidate index; no second catalogue or persisted language flag.
create index if not exists home_spotlight_candidate_hash_idx on public.for_you_candidates((md5(segment_id::text) collate "C"),segment_id);
create index if not exists home_spotlight_segment_window_idx on public.transcript_segments(transcript_id,position);

create function transcript_private.home_spotlight_window(p_id uuid,p_position integer,p_start numeric,p_duration numeric,p_allow_source_tokens boolean)
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
   or s.start_seconds<p_start or s.stop>p_start+60
   or (s.ord=1 and s.position<>p_position)
   or (s.previous_position is not null and s.position<>s.previous_position+1)
   or s.start_seconds<s.previous_start or s.start_seconds>s.previous_stop+2
   or not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(s.token_data)='array' then s.token_data else '[]'::jsonb end) tok
    where btrim(coalesce(tok->>'arabic',tok->>'ar',tok->>'surface',case when jsonb_typeof(tok)='string' then tok#>>'{}' end,''))<>'')
   ),257)
  -- Original typed row is required by the existing canonical quality helper.
 ), boundary as (
  select ord,stop from safe where stop-p_start between 30 and 60 and words>=5
  order by (stop-p_start>=40) desc,(btrim(original_text) ~ '[.!?؟۔]["'' )]*$') desc,stop desc,ord limit 1
 )
 select case when exists(select 1 from boundary) then jsonb_build_object(
  'clip_start_ms',round(p_start*1000)::bigint,'clip_end_ms',(select round(stop*1000)::bigint from boundary),
  'segments',(select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'original_text',s.original_text,'english_text',s.english_text,
   'start_seconds',s.start_seconds,'end_seconds',s.end_seconds,'canonical_paragraph',s.canonical_paragraph,'source_tokens',s.token_data) order by s.position,s.id)
   from safe s join boundary b on s.ord<=b.ord)) end;
$$;

create function public.home_for_you_spotlight(p_seed text,p_allow_source_tokens boolean default false)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_pivot text:=md5(left(coalesce(p_seed,''),64));v_clip jsonb;v_wrap boolean;
begin
 if not exists(select 1 from public.transcript_groups where id='5b98c563-5c35-4696-98e1-06aa000eb622') then
  raise exception 'English transcript classification is unavailable';
 end if;
 -- Two indexed hash ranges implement a seeded ring, without a full-table sort
 -- or bias toward sources after large gaps in numeric segment IDs.
 -- Duration, quality, publication and AR restrictions apply BEFORE LIMIT 1.
 for v_wrap in select unnest(array[false,true]) loop
  with recursive english(id) as (
   select id from public.transcript_groups where id='5b98c563-5c35-4696-98e1-06aa000eb622'
   union select g.id from public.transcript_groups g join english e on g.parent_id=e.id
  )
  select w.clip||jsonb_build_object('video',jsonb_build_object('id',t.id,'youtube_id',t.youtube_id,'title',t.title,'channel',t.channel)) into v_clip
  from public.for_you_candidates c join public.youtube_transcripts t on t.id=c.transcript_id
  cross join lateral (with chosen as materialized(select transcript_private.home_spotlight_window(t.id,c.position,c.start_seconds,t.duration_seconds,p_allow_source_tokens) clip) select clip from chosen) w
  where (md5(c.segment_id::text) collate "C")>=(case when v_wrap then '' else v_pivot end) collate "C"
   and (md5(c.segment_id::text) collate "C")<(case when v_wrap then v_pivot else 'g' end) collate "C"
   and transcript_private.for_you_source_allowed(t.id)
   and not exists(select 1 from public.admin_manual_transcripts m join english e on e.id=m.group_id where m.transcript_id=t.id)
   and w.clip is not null
  order by md5(c.segment_id::text) collate "C",c.segment_id limit 1;
  if v_clip is not null then return v_clip;end if;
 end loop;
 return null;
end;$$;
revoke all on function transcript_private.home_spotlight_window(uuid,integer,numeric,numeric,boolean) from public,anon,authenticated;
revoke all on function public.home_for_you_spotlight(text,boolean) from public,anon,authenticated;
grant execute on function transcript_private.home_spotlight_window(uuid,integer,numeric,numeric,boolean),public.home_for_you_spotlight(text,boolean) to service_role;
