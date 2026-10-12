-- Share the existing Manual Import database validation with Edit.
create function transcript_private.validate_admin_transcript_json(p_raw jsonb) returns void
language plpgsql set search_path='' as $$
declare c jsonb; k jsonb; n integer; i integer:=0;
begin
 if jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length(p_raw::text)>20971520 then
  raise exception 'Invalid transcript or import exceeds the 20 MB budget';
 end if;
 n:=jsonb_array_length(p_raw->'content');
 if n<1 then raise exception 'Transcript needs at least one timed segment'; end if;
 for c in select value from jsonb_array_elements(p_raw->'content') loop
  i:=i+1;
  if jsonb_typeof(c->'text') is distinct from 'string' or length(btrim(c->>'text'))<1 or c->>'text' !~ U&'[\0600-\06FF]'
  or jsonb_typeof(c->'offset') is distinct from 'number' or jsonb_typeof(c->'duration') is distinct from 'number' then raise exception 'Segment %: needs Arabic text, offset and duration',i; end if;
  if (c->>'offset')::numeric<0 or (c->>'offset')::numeric<>trunc((c->>'offset')::numeric)
  or (c->>'duration')::numeric<=0 or (c->>'duration')::numeric<>trunc((c->>'duration')::numeric)
  or (c->>'offset')::numeric+(c->>'duration')::numeric>43200000 then raise exception 'Segment %: invalid millisecond interval',i; end if;
  if c ? 'english' and jsonb_typeof(c->'english') is distinct from 'string' then raise exception 'Segment %: english must be text',i; end if;
  if c ? 'tokens' then
   if jsonb_typeof(c->'tokens') is distinct from 'array' then raise exception 'Segment %: tokens must be an array',i; end if;
   for k in select value from jsonb_array_elements(c->'tokens') loop
    if jsonb_typeof(k) is distinct from 'object' or jsonb_typeof(coalesce(k->'ar',k->'arabic',k->'surface')) is distinct from 'string' then raise exception 'Segment %: token needs Arabic text',i; end if;
    if k ? 'start_ms' or k ? 'end_ms' then
     if jsonb_typeof(k->'start_ms') is distinct from 'number' or jsonb_typeof(k->'end_ms') is distinct from 'number' then raise exception 'Segment %: token needs start_ms and end_ms',i; end if;
     if (k->>'start_ms')::numeric<>trunc((k->>'start_ms')::numeric) or (k->>'end_ms')::numeric<>trunc((k->>'end_ms')::numeric)
     or (k->>'start_ms')::numeric<(c->>'offset')::numeric or (k->>'end_ms')::numeric<=(k->>'start_ms')::numeric
     or (k->>'end_ms')::numeric>(c->>'offset')::numeric+(c->>'duration')::numeric then raise exception 'Segment %: token timing outside its sentence',i; end if;
    end if;
   end loop;
  end if;
 end loop;
end $$;
revoke all on function transcript_private.validate_admin_transcript_json(jsonb) from public,anon,authenticated;
grant execute on function transcript_private.validate_admin_transcript_json(jsonb) to service_role;

-- Replace only the validation block, preserving import/provenance behaviour.
do $migration$
declare definition text; validation_start integer; validation_end integer;
begin
 definition:=pg_get_functiondef('public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean)'::regprocedure);
 validation_start:=strpos(definition,'n:=jsonb_array_length');
 validation_end:=strpos(definition,'perform pg_advisory_xact_lock');
 if validation_start=0 or validation_end<=validation_start then raise exception 'manual_import_definition_changed'; end if;
 execute substr(definition,1,validation_start-1)||'perform transcript_private.validate_admin_transcript_json(p_raw);'||chr(10)||substr(definition,validation_end);
end $migration$;

-- These are the existing shared reader columns; some website checkouts predate them.
alter table public.transcript_segments add column if not exists canonical_paragraph jsonb;
alter table public.youtube_transcripts add column if not exists canonical_transcript jsonb;

create function public.admin_update_transcript_json(p_actor uuid,p_id uuid,p_raw jsonb,
 p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare previous public.youtube_transcripts; lease uuid:=gen_random_uuid(); translated text;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 300 or p_channel is null
  or length(p_channel)>300 or p_searchable is null or p_updated_at is null then raise exception 'invalid_transcript_settings'; end if;
 perform transcript_private.validate_admin_transcript_json(p_raw);
 -- Translation workers lock their job first. Cancel the old job under the same
 -- lock order so a stale provider response cannot overwrite the edited content.
 perform 1 from transcript_private.translations where transcript_id=p_id for update;
 select * into previous from public.youtube_transcripts where id=p_id for update;
 if not found then raise exception 'transcript_not_found'; end if;
 if previous.updated_at is distinct from p_updated_at then raise exception 'transcript_edit_conflict'; end if;
 if previous.status in ('queued','processing','indexing') or previous.lease_until>now() then raise exception 'transcript_edit_busy'; end if;
 delete from transcript_private.translations where transcript_id=p_id;
 -- Temporarily suppress provider translation and publication triggers. These
 -- changes are private to this transaction; original metadata is restored below.
 update public.youtube_transcripts set provider='manual',searchable=false,status='indexing',
  raw_transcript=coalesce(previous.raw_transcript,'{}'::jsonb)||jsonb_build_object('lang','ar','content',p_raw->'content'),
  lease_id=lease,lease_until=now()+interval '3 minutes' where id=p_id;
 -- FK cascades remove stale search tokens and clip rows with their old segments.
 -- Existing indexer regenerates segment ordering, normalisation and search data.
 delete from public.transcript_segments where transcript_id=p_id;
 perform public.index_youtube_transcript(p_id,lease);
 if not exists(select 1 from public.youtube_transcripts where id=p_id and status='ready')
  or (select count(*) from public.transcript_segments where transcript_id=p_id)<>jsonb_array_length(p_raw->'content')
  then raise exception 'transcript_index_failed'; end if;
 with ordered as (
  select x,row_number() over(order by (x->>'offset')::numeric,ord)-1 pos
  from jsonb_array_elements(p_raw->'content') with ordinality a(x,ord)
 )
 update public.transcript_segments s set english_text=nullif(btrim(o.x->>'english'),''),
  canonical_paragraph=jsonb_build_object(
   'tokens',coalesce((select jsonb_agg(w||jsonb_build_object('arabic',coalesce(w->>'ar',w->>'arabic',w->>'surface'),
    'english',coalesce(w->>'gloss',w->>'english','')) order by ord)
    from jsonb_array_elements(coalesce(o.x->'tokens','[]'::jsonb)) with ordinality a(w,ord)),'[]'::jsonb),
   'timestamp',to_char(make_interval(secs=>s.start_seconds),'HH24:MI:SS'),
   'translation',coalesce(o.x->>'english',''),'paragraph',coalesce((o.x->>'paragraph')::integer,s.position+1))
 from ordered o where s.transcript_id=p_id and s.position=o.pos and s.original_text=o.x->>'text';
 translated:=case when not exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is null) then 'ready'
  when exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is not null) then 'partial' else 'unavailable' end;
 update public.youtube_transcripts set translation_status=translated,
  canonical_transcript=(select jsonb_agg(canonical_paragraph order by position) from public.transcript_segments where transcript_id=p_id)
  where id=p_id;
 -- Restore explicit publication/feed choices after the ready-translation trigger.
 -- The established generated-publication guard still rejects incomplete English.
 update public.youtube_transcripts set title=btrim(p_title),channel=nullif(btrim(p_channel),''),
  provider=previous.provider,searchable=p_searchable,feed_eligible=previous.feed_eligible,
  duration_seconds=greatest(coalesce(previous.duration_seconds,0),(select max((x->>'offset')::numeric+(x->>'duration')::numeric)/1000 from jsonb_array_elements(p_raw->'content') x)),
  updated_at=clock_timestamp() where id=p_id;
 return (select updated_at from public.youtube_transcripts where id=p_id);
end $$;
revoke all on function public.admin_update_transcript_json(uuid,uuid,jsonb,text,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_update_transcript_json(uuid,uuid,jsonb,text,text,boolean,timestamptz) to service_role;
notify pgrst,'reload schema';
