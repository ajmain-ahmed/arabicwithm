CREATE OR REPLACE FUNCTION transcript_private.manual_transcript_allowed(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.youtube_transcripts t where t.id=p_id and t.provider='manual'
 and t.source_origin='website_admin_transcript' and t.episode_id is null
 and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id));
$function$;

CREATE OR REPLACE FUNCTION transcript_private.retain_source_paragraphs(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if transcript_private.manual_transcript_allowed(p_id) then perform transcript_private.retain_manual_awm_paragraphs(p_id);
 else perform transcript_private.retain_generated_source_paragraphs(p_id); end if;
end $function$;

CREATE OR REPLACE FUNCTION transcript_private.guard_canonical_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_table_name='youtube_transcripts' then
  if new.canonical_transcript is not null then
   perform transcript_private.validate_transcript_projection(new.id,new.canonical_transcript);
  end if;
 else
  if new.canonical_paragraph is not null then
   perform transcript_private.validate_transcript_projection(new.transcript_id,jsonb_build_array(new.canonical_paragraph),new.position+1);
  end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION transcript_private.enrich_tokens(p_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.transcript_tokens k set lemma=m.lemma,root=m.root
  from (select normalised,
    case when count(distinct lemma)=1 then min(lemma) end lemma,
    case when count(distinct root)=1 then min(root) end root
    from (select l.normalised,l.lemma,coalesce(nullif(l.root,''),d.root) root
      from transcript_private.lexicon l left join (
        select normalised,case when count(distinct nullif(root,''))=1 then min(nullif(root,'')) end root
        from transcript_private.lexicon group by normalised) d on d.normalised=l.lemma
      where l.source<>'hans_wehr' or not exists(select 1 from transcript_private.lexicon curated where curated.normalised=l.normalised and curated.source<>'hans_wehr')) linked
    group by normalised) m
  where k.normalised=m.normalised and (p_id is null or exists (
    select 1 from public.transcript_segments s where s.id=k.segment_id and s.transcript_id=p_id));
$function$;

CREATE OR REPLACE FUNCTION public.admin_import_grouped_transcript(p_actor uuid, p_youtube_id text, p_title text, p_channel text, p_raw jsonb, p_searchable boolean, p_group uuid DEFAULT NULL::uuid, p_duration double precision DEFAULT NULL::double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result uuid; stage text:='validation'; failure text; state text;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 perform transcript_private.validate_standalone_transcript_json(p_raw);
 if p_group is not null then
  stage:='group assignment';
  perform 1 from public.transcript_groups where id=p_group for key share;
  if not found then raise exception using errcode='23503',message='The selected group no longer exists. Choose another group or Ungrouped.'; end if;
 end if;
 stage:='video lookup';
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 if exists(select 1 from public.youtube_transcripts where youtube_id=p_youtube_id) then
  raise exception 'This video already exists. Edit its saved transcript instead of importing again.'; end if;
 stage:='timed transcript indexing and enrichment';
 result:=public.admin_import_youtube_transcript(p_actor,p_youtube_id,p_title,p_channel,p_raw,p_searchable);
 if not transcript_private.manual_transcript_allowed(result) then raise exception 'This video belongs to Shows or another import workflow'; end if;
 stage:='group assignment';
 insert into public.admin_manual_transcripts(transcript_id,group_id) values(result,p_group);
 stage:='video duration';
 if p_duration is not null then
  if p_duration<=0 or p_duration>43200 or p_duration='NaN'::float8 or p_duration<(select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x) then raise exception 'Video duration ends before the transcript'; end if;
  update public.youtube_transcripts set duration_seconds=p_duration where id=result;
 end if;
 return result;
exception when others then
 get stacked diagnostics failure=message_text,state=returned_sqlstate;
 raise exception using errcode=state,message=format('Import %s: %s',stage,failure);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_save_grouped_transcript(p_actor uuid, p_id uuid, p_raw jsonb, p_title text, p_channel text, p_searchable boolean, p_updated_at timestamp with time zone, p_youtube_id text, p_group uuid DEFAULT NULL::uuid, p_duration double precision DEFAULT NULL::double precision)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare previous public.youtube_transcripts; result timestamptz; lease uuid:=gen_random_uuid();
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' or p_title is null or length(btrim(p_title)) not between 1 and 300
  or p_channel is null or length(p_channel)>300 or p_searchable is null or p_updated_at is null then raise exception 'invalid_transcript_settings'; end if;
 perform transcript_private.validate_standalone_transcript_json(p_raw);
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,82741603));
 perform 1 from transcript_private.translations where transcript_id=p_id for update;
 select * into previous from public.youtube_transcripts where id=p_id for update;
 if not found or not transcript_private.manual_transcript_allowed(p_id) or exists(select 1 from public.episodes where youtube_id=p_youtube_id)
 then raise exception 'Only manual transcripts can be edited here'; end if;
 if previous.updated_at is distinct from p_updated_at then raise exception 'transcript_edit_conflict'; end if;
 if previous.status in ('queued','processing','indexing') or previous.lease_until>now() then raise exception 'transcript_edit_busy'; end if;
 if p_duration is not null and (p_duration<=0 or p_duration>43200 or p_duration='NaN'::float8
  or p_duration<(select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x)) then raise exception 'Video duration ends before the transcript'; end if;
 -- This RPC is for actual content/metadata edits. Group-only saves use Move.
 delete from transcript_private.translations where transcript_id=p_id;
 update public.youtube_transcripts set searchable=false,status='indexing',canonical_transcript=null,
  raw_transcript=coalesce(previous.raw_transcript,'{}'::jsonb)||jsonb_build_object('lang','ar','content',p_raw->'content'),lease_id=lease,lease_until=now()+interval '3 minutes' where id=p_id;
 delete from public.transcript_segments where transcript_id=p_id;
 perform public.index_youtube_transcript(p_id,lease);
 if not exists(select 1 from public.youtube_transcripts where id=p_id and status='ready') then raise exception 'transcript_index_failed'; end if;
 with source as(select a.c,row_number() over(order by (a.c->>'offset')::numeric,a.ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(c,ord))
 update public.transcript_segments s set english_text=nullif(btrim(o.c->>'english'),'') from source o where s.transcript_id=p_id and s.position=o.pos;
 update public.youtube_transcripts set title=btrim(p_title),channel=nullif(btrim(p_channel),''),searchable=p_searchable,feed_eligible=previous.feed_eligible,
  youtube_id=p_youtube_id,canonical_url='https://www.youtube.com/watch?v='||p_youtube_id,
  thumbnail=case when previous.youtube_id<>p_youtube_id then 'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg' else previous.thumbnail end,
  duration_seconds=coalesce(p_duration,previous.duration_seconds),
  canonical_transcript=case when not exists(select 1 from public.transcript_segments where transcript_id=p_id and canonical_paragraph is null)
   then (select jsonb_agg(canonical_paragraph order by position) from public.transcript_segments where transcript_id=p_id) else null end,
  translation_status=case when not exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is null) then 'ready'
   when exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is not null) then 'partial' else 'unavailable' end,
  updated_at=clock_timestamp() where id=p_id returning updated_at into result;
 insert into public.admin_manual_transcripts(transcript_id,group_id) values(p_id,p_group) on conflict(transcript_id) do update set group_id=excluded.group_id;
 return result;
end $function$;
