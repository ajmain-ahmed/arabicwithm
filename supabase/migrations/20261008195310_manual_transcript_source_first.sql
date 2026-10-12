-- Source storage is mandatory. Linguistic enrichment is optional and retryable.
begin;
alter table public.transcript_segments alter column end_seconds drop not null;
create table transcript_private.manual_sources(
 transcript_id uuid primary key references public.youtube_transcripts(id) on delete cascade,
 original_json text, source jsonb not null,
 enrichment_status text not null default 'unavailable' check(enrichment_status in ('ready','partial','unavailable')),
 diagnostics jsonb not null default '[]', updated_at timestamptz not null default now()
);
alter table transcript_private.manual_sources enable row level security;
revoke all on transcript_private.manual_sources from public,anon,authenticated;
grant select,insert,update,delete on transcript_private.manual_sources to service_role;
create or replace function transcript_private.validate_standalone_transcript_json(p_raw jsonb) returns void
language plpgsql set search_path='' as $$
declare c jsonb; n integer:=0; problems text[]:=array[]::text[]; previous numeric; start_time numeric; duration_time numeric;
begin
 if jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length((p_raw->'content')::text)>20971520 then raise exception 'Expected content array of at most 20 MB';end if;
 if jsonb_array_length(p_raw->'content')=0 then raise exception 'Transcript needs at least one timed segment';end if;
 for c in select value from jsonb_array_elements(p_raw->'content') loop
  n:=n+1;
  if jsonb_typeof(c->'text') is distinct from 'string' or btrim(c->>'text')='' then problems:=array_append(problems,format('Segment %s: text is required.',n));end if;
  if c ? 'english' and jsonb_typeof(c->'english') is distinct from 'string' then problems:=array_append(problems,format('Segment %s: english must be text.',n));end if;
  if jsonb_typeof(c->'offset') is distinct from 'number' then problems:=array_append(problems,format('Segment %s: offset must be integer milliseconds.',n));continue;end if;
  start_time:=(c->>'offset')::numeric;
  if start_time<0 or start_time>43200000 or start_time<>trunc(start_time) then problems:=array_append(problems,format('Segment %s: invalid start timestamp.',n));end if;
  if previous is not null and start_time<previous then problems:=array_append(problems,format('Segment %s: timestamp-order error.',n));end if;previous:=start_time;
  if c ? 'duration' and c->'duration'<>'null'::jsonb then
   if jsonb_typeof(c->'duration') is distinct from 'number' then problems:=array_append(problems,format('Segment %s: duration must be integer milliseconds or null.',n));continue;end if;
   duration_time:=(c->>'duration')::numeric;
   if duration_time<0 or duration_time<>trunc(duration_time) or start_time+duration_time>43200000 then problems:=array_append(problems,format('Segment %s: invalid end timestamp.',n));end if;
  end if;
 end loop;
 if cardinality(problems)>0 then raise exception using message=array_to_string(problems,E'\n');end if;
end $$;
create or replace function transcript_private.usable_manual_token(token jsonb) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(token)='object' and jsonb_typeof(coalesce(token->'ar',token->'arabic',token->'surface'))='string'
 and btrim(coalesce(token->>'ar',token->>'arabic',token->>'surface'))<>''
 and jsonb_typeof(coalesce(token->'english',token->'gloss'))='string' and btrim(coalesce(token->>'english',token->>'gloss'))<>''
 and jsonb_typeof(coalesce(token->'pos',token->'POS'))='string' and btrim(coalesce(token->>'pos',token->>'POS'))<>''
 and jsonb_typeof(token->'transliteration')='string' and btrim(token->>'transliteration')<>''
 and token->>'entry_type' in ('word','phrase') and jsonb_typeof(token->'headword') in ('string','null')
 and (token->>'entry_type'<>'phrase' or token->>'headword'~'^[1-9][0-9]*$'),false);
$$;
create or replace function transcript_private.validate_manual_awm_canonical(p_canonical jsonb,p_first integer default 1) returns void
language plpgsql immutable set search_path='' as $$
declare item jsonb; token jsonb;
begin
 if jsonb_typeof(p_canonical) is distinct from 'array' then raise exception 'Invalid canonical projection';end if;
 for item in select value from jsonb_array_elements(p_canonical) loop
  if jsonb_typeof(item->'tokens') is distinct from 'array' then raise exception 'Invalid canonical token array';end if;
  for token in select value from jsonb_array_elements(item->'tokens') loop
   if not transcript_private.usable_manual_token(token) then raise exception 'Invalid optional canonical token';end if;
  end loop;
 end loop;
end $$;
create or replace function transcript_private.enrich_manual_source(p_id uuid) returns void
language plpgsql set search_path='' as $$
declare item jsonb; t jsonb; projection jsonb; tokens jsonb; n integer:=0; k integer; usable integer:=0; total integer:=0; problems jsonb:='[]';
begin
 for item in select value from jsonb_array_elements((select raw_transcript->'content' from public.youtube_transcripts where id=p_id)) loop
  tokens:='[]';k:=0;
  if jsonb_typeof(item->'tokens')='array' then
   for t in select value from jsonb_array_elements(item->'tokens') loop
    k:=k+1;total:=total+1;
    if transcript_private.usable_manual_token(t) then
     usable:=usable+1;
     tokens:=tokens||jsonb_build_array(jsonb_build_object('arabic',coalesce(t->>'ar',t->>'arabic',t->>'surface'),'english',coalesce(t->>'english',t->>'gloss'),'pos',coalesce(t->>'pos',t->>'POS'),'headword',t->'headword','entry_type',t->>'entry_type','transliteration',t->>'transliteration'));
    else problems:=problems||jsonb_build_array(jsonb_build_object('segment',n+1,'token',k,'reason','Optional enrichment unavailable; original source retained'));end if;
   end loop;
  else problems:=problems||jsonb_build_array(jsonb_build_object('segment',n+1,'reason','Optional token enrichment absent or unsupported; original source retained'));end if;
  projection:=null;
  if k>0 and jsonb_array_length(tokens)=k then projection:=jsonb_build_object('tokens',tokens,'translation',coalesce(item->>'english',''),'timestamp',transcript_private.manual_awm_timestamp((item->>'offset')::float8/1000),'paragraph',n+1);end if;
  update public.transcript_segments set canonical_paragraph=projection where transcript_id=p_id and position=n;
  n:=n+1;
 end loop;
 -- Only linguistic operations may fail softly. Storage/permission failures still abort the transaction.
 begin perform transcript_private.enrich_tokens(p_id);
 exception when data_exception or raise_exception or undefined_function or undefined_table or insufficient_privilege then problems:=problems||jsonb_build_array(jsonb_build_object('operation','dictionary enrichment','sqlstate',sqlstate,'reason',sqlerrm));end;
 update transcript_private.manual_sources set enrichment_status=case when usable=0 then 'unavailable' when usable=total and jsonb_array_length(problems)=0 then 'ready' else 'partial' end,diagnostics=problems,updated_at=now() where transcript_id=p_id;
end $$;
create or replace function transcript_private.index_manual_source(p_id uuid,p_lease uuid) returns void
language plpgsql set search_path='' as $$
declare raw jsonb;
begin
 select raw_transcript into raw from public.youtube_transcripts where id=p_id and lease_id=p_lease for update;
 if not found then raise exception 'lease_lost';end if;
 perform transcript_private.validate_standalone_transcript_json(raw);
 insert into transcript_private.manual_sources(transcript_id,original_json,source) values(p_id,raw->>'_source_json',raw-'_source_json')
 on conflict(transcript_id) do update set original_json=coalesce(transcript_private.manual_sources.original_json,excluded.original_json),source=excluded.source;
 delete from public.transcript_segments where transcript_id=p_id;
 insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,normalised_text,english_text)
 select p_id,(ord-1)::int,(c->>'offset')::float8/1000,
 case when c->>'duration' is not null then ((c->>'offset')::float8+(c->>'duration')::float8)/1000
 else (select min((later->>'offset')::float8)/1000 from jsonb_array_elements(raw->'content') later where (later->>'offset')::numeric>(c->>'offset')::numeric) end,
 c->>'text',public.normalise_transcript_word(c->>'text'),c->>'english'
 from jsonb_array_elements(raw->'content') with ordinality a(c,ord);
 -- General text search tokens are independent of dictionary matching. Preserve their source surfaces.
 insert into public.transcript_tokens(segment_id,position,surface,normalised)
 select s.id,(ord-1)::int,parts[1],public.normalise_transcript_word(parts[1]) from public.transcript_segments s
 cross join lateral regexp_matches(s.original_text,'([^[:space:]]+)','g') with ordinality a(parts,ord)
 where s.transcript_id=p_id and public.normalise_transcript_word(parts[1])<>'';
 perform transcript_private.enrich_manual_source(p_id);
 update public.youtube_transcripts set status='ready',error_code=null,raw_transcript=raw-'_source_json',lease_id=null,lease_until=null,updated_at=now() where id=p_id;
end $$;

CREATE OR REPLACE FUNCTION public.index_youtube_transcript(p_id uuid, p_lease uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare raw jsonb; source_provider text;
begin
 if transcript_private.manual_transcript_allowed(p_id) then perform transcript_private.index_manual_source(p_id,p_lease);return;end if;
  select raw_transcript,provider into raw,source_provider from public.youtube_transcripts where id=p_id and lease_id=p_lease for update;
  if not found then raise exception 'lease_lost'; end if;
  if raw is not null and jsonb_typeof(raw->'content')='array' and jsonb_array_length(raw->'content')>0
    and (select count(*) from public.transcript_segments where transcript_id=p_id)=jsonb_array_length(raw->'content')
    and not exists(with ordered as (select c,row_number() over(order by (c->>'offset')::double precision,ord)-1 pos
      from jsonb_array_elements(raw->'content') with ordinality x(c,ord))
      select 1 from ordered o left join public.transcript_segments s on s.transcript_id=p_id and s.position=o.pos
      where s.id is null or s.start_seconds<>(o.c->>'offset')::double precision/1000
        or s.end_seconds<>((o.c->>'offset')::double precision+(o.c->>'duration')::double precision)/1000 or s.original_text<>o.c->>'text') then
    update public.youtube_transcripts set status='ready',error_code=null,lease_id=null,lease_until=null,updated_at=now() where id=p_id;
  else
    if exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is not null)
      then raise exception 'translated_source_changed'; end if;
    perform public.index_youtube_transcript_base(p_id,p_lease);
  end if;
  if source_provider='gladia' and raw->>'provider'='gladia' then
    with ordered as (select c,row_number() over(order by (c->>'offset')::double precision,ord)-1 pos
      from jsonb_array_elements(raw->'content') with ordinality x(c,ord))
    update public.transcript_segments s set english_text=btrim(o.c->>'english') from ordered o
      where s.transcript_id=p_id and s.position=o.pos and s.original_text=o.c->>'text'
      and nullif(s.english_text,'') is null and jsonb_typeof(o.c->'english')='string' and btrim(o.c->>'english')<>'';
    update public.youtube_transcripts set translation_status=case
      when not exists(select 1 from public.transcript_segments where transcript_id=p_id and nullif(english_text,'') is null) then 'ready'
      when exists(select 1 from public.transcript_segments where transcript_id=p_id and nullif(english_text,'') is not null) then 'partial'
      else 'unavailable' end where id=p_id;
  end if;
  perform transcript_private.retain_source_paragraphs(p_id); perform transcript_private.enrich_tokens(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.admin_import_youtube_transcript(p_actor uuid, p_youtube_id text, p_title text, p_channel text, p_raw jsonb, p_searchable boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v uuid; l uuid:=gen_random_uuid(); c jsonb; k jsonb; n integer; i integer:=0;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' or p_title is null or length(btrim(p_title)) not between 1 and 300
 or length(coalesce(p_channel,''))>300 or jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length((p_raw->'content')::text)>20971520 then raise exception 'Invalid transcript or import exceeds the 20 MB budget'; end if;
 perform transcript_private.validate_standalone_transcript_json(p_raw);
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 select id into v from public.youtube_transcripts where youtube_id=p_youtube_id for update;
 if found then perform public.admin_record_transcript_origin(p_actor,v); return v; end if;
 insert into public.youtube_transcripts(youtube_id,canonical_url,title,channel,thumbnail,provider,status,searchable,raw_transcript,lease_id,lease_until,duration_seconds,source_origin)
 values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id,btrim(p_title),coalesce(nullif(btrim(p_channel),''),'Unknown channel'),'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg','manual','indexing',p_searchable,
 p_raw||jsonb_build_object('provider','manual','lang','ar'),l,now()+interval '3 minutes',
 null,'website_admin_transcript') returning id into v;
 perform public.index_youtube_transcript(v,l);
 if not exists(select 1 from public.youtube_transcripts where id=v and status='ready') then raise exception 'Transcript could not be indexed as Arabic'; end if;
 with ordered as (select x,row_number() over(order by (x->>'offset')::double precision,ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(x,ord))
 update public.transcript_segments s set english_text=o.x->>'english' from ordered o where s.transcript_id=v and s.position=o.pos and s.original_text=o.x->>'text';
 update public.youtube_transcripts set translation_status=case
 when not exists(select 1 from public.transcript_segments where transcript_id=v and english_text is null) then 'ready'
 when exists(select 1 from public.transcript_segments where transcript_id=v and english_text is not null) then 'partial' else 'unavailable' end where id=v;
 perform public.admin_record_transcript_origin(p_actor,v);
 return v;
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
  raw_transcript=coalesce(previous.raw_transcript,'{}'::jsonb)||p_raw||jsonb_build_object('lang','ar'),lease_id=lease,lease_until=now()+interval '3 minutes' where id=p_id;
 delete from public.transcript_segments where transcript_id=p_id;
 perform public.index_youtube_transcript(p_id,lease);
 if not exists(select 1 from public.youtube_transcripts where id=p_id and status='ready') then raise exception 'transcript_index_failed'; end if;
 with source as(select a.c,row_number() over(order by (a.c->>'offset')::numeric,a.ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(c,ord))
 update public.transcript_segments s set english_text=o.c->>'english' from source o where s.transcript_id=p_id and s.position=o.pos;
 update public.youtube_transcripts set title=btrim(p_title),channel=coalesce(nullif(btrim(p_channel),''),'Unknown channel'),searchable=p_searchable,feed_eligible=previous.feed_eligible,
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

create or replace function public.admin_manual_enrichment(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 return (select jsonb_build_object('status',enrichment_status,'diagnostics',diagnostics,'originalJson',original_json) from transcript_private.manual_sources where transcript_id=p_id);
end $$;
create or replace function public.admin_retry_manual_enrichment(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 perform 1 from public.youtube_transcripts where id=p_id for update;
 if not transcript_private.manual_transcript_allowed(p_id) then raise exception 'Only standalone manual transcripts can be enriched here';end if;
 if not exists(select 1 from transcript_private.manual_sources where transcript_id=p_id) then raise exception 'This legacy transcript has no independent source snapshot; edit once to enable retry';end if;
 perform transcript_private.enrich_manual_source(p_id);
 return public.admin_manual_enrichment(p_actor,p_id);
end $$;
create or replace function public.admin_import_manual_source(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_group uuid default null,p_duration float8 default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare id uuid;
begin
 id:=public.admin_import_grouped_transcript(p_actor,p_youtube_id,p_title,p_channel,p_raw,p_searchable,p_group,p_duration);
 return jsonb_build_object('id',id,'enrichment',public.admin_manual_enrichment(p_actor,id)->>'status');
end $$;
create or replace function public.admin_save_manual_source(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz,p_youtube_id text,p_group uuid default null,p_duration float8 default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare version timestamptz;
begin
 version:=public.admin_save_grouped_transcript(p_actor,p_id,p_raw,p_title,p_channel,p_searchable,p_updated_at,p_youtube_id,p_group,p_duration);
 return jsonb_build_object('updatedAt',version,'enrichment',public.admin_manual_enrichment(p_actor,p_id)->>'status');
end $$;
revoke all on function public.admin_manual_enrichment(uuid,uuid),public.admin_retry_manual_enrichment(uuid,uuid),public.admin_import_manual_source(uuid,text,text,text,jsonb,boolean,uuid,float8),public.admin_save_manual_source(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,float8) from public,anon,authenticated;
grant execute on function public.admin_manual_enrichment(uuid,uuid),public.admin_retry_manual_enrichment(uuid,uuid),public.admin_import_manual_source(uuid,text,text,text,jsonb,boolean,uuid,float8),public.admin_save_manual_source(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,float8) to service_role;
revoke all on function transcript_private.usable_manual_token(jsonb),transcript_private.enrich_manual_source(uuid),transcript_private.index_manual_source(uuid,uuid) from public,anon,authenticated;
grant execute on function transcript_private.usable_manual_token(jsonb),transcript_private.enrich_manual_source(uuid),transcript_private.index_manual_source(uuid,uuid) to service_role;
commit;
