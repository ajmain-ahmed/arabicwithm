-- Manual imports retain their existing JSON/source/search contracts. Each batch
-- commits segments, search tokens, canonical enrichment and its checkpoint together.
begin;

create table transcript_private.manual_import_jobs (
 id uuid primary key default gen_random_uuid(), actor uuid not null,
 import_key text not null check(import_key ~ '^[a-f0-9]{64}$'),
 transcript_id uuid not null unique references public.youtube_transcripts(id) on delete cascade,
 source jsonb not null, expected_segments integer not null check(expected_segments>0),
 committed_segments integer not null default 0, search_tokens integer not null default 0,
 enrichment_total integer not null default 0, enrichment_usable integer not null default 0,
 canonical_segments integer not null default 0, requested_searchable boolean not null,
 completed boolean not null default false, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(actor,import_key)
);
create table transcript_private.manual_import_batches (
 import_id uuid not null references transcript_private.manual_import_jobs(id) on delete cascade,
 first_position integer not null, segment_count integer not null check(segment_count>0),
 search_tokens integer not null, diagnostics jsonb not null default '[]',
 committed_at timestamptz not null default now(), primary key(import_id,first_position)
);
alter table transcript_private.manual_import_jobs enable row level security;
alter table transcript_private.manual_import_batches enable row level security;
revoke all on transcript_private.manual_import_jobs,transcript_private.manual_import_batches from public,anon,authenticated,service_role;

-- Remember eligibility while asynchronous classification completes. Existing
-- explicitly excluded videos are not accidentally promoted by the worker.
alter table transcript_private.for_you_classification_queue
 add column restore_feed_eligible boolean not null default false;

create function transcript_private.manual_import_state(p_actor uuid,p_import uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j transcript_private.manual_import_jobs;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select * into j from transcript_private.manual_import_jobs where id=p_import and actor=p_actor;
 if not found then raise exception 'Import not found';end if;
 return jsonb_build_object('importId',j.id,'id',j.transcript_id,'completed',j.completed,
  'committed',j.committed_segments,'expected',j.expected_segments,'tokens',j.search_tokens,
  'enrichment',case when j.completed then (select enrichment_status from transcript_private.manual_sources where transcript_id=j.transcript_id)
    when j.enrichment_usable=0 then 'unavailable'
    when j.enrichment_usable=j.enrichment_total and j.canonical_segments=j.expected_segments then 'ready' else 'partial' end);
end $$;

create function transcript_private.begin_manual_import(p_actor uuid,p_key text,p_youtube_id text,
 p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_group uuid,p_duration double precision) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j transcript_private.manual_import_jobs; v uuid; job_id uuid:=gen_random_uuid(); max_end float8;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$'
  or p_title is null or length(btrim(p_title)) not between 1 and 300 or length(coalesce(p_channel,''))>300
  or p_searchable is null then raise exception 'Invalid import metadata';end if;
 perform transcript_private.validate_standalone_transcript_json(p_raw-'_source_json');
 if p_raw ? '_source_json' and (jsonb_typeof(p_raw->'_source_json')<>'string' or octet_length(p_raw->>'_source_json')>20971520)
  then raise exception 'Original JSON must be a string no larger than 20 MB';end if;
 if p_group is not null then
  perform 1 from public.transcript_groups where id=p_group for key share;
  if not found then raise exception using errcode='23503',message='The selected group no longer exists';end if;
 end if;
 select max((x->>'offset')::float8+coalesce((x->>'duration')::float8,0))/1000
  into max_end from jsonb_array_elements(p_raw->'content') x;
 if p_duration is not null and (p_duration<=0 or p_duration>43200 or p_duration='NaN'::float8 or p_duration<max_end)
  then raise exception 'Video duration ends before the transcript';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 select * into j from transcript_private.manual_import_jobs where actor=p_actor and import_key=p_key for update;
 if found then
  if j.source is distinct from p_raw then raise exception 'Import identifier does not match source';end if;
  return transcript_private.manual_import_state(p_actor,j.id);
 end if;
 if exists(select 1 from public.youtube_transcripts where youtube_id=p_youtube_id)
  or exists(select 1 from public.episodes where youtube_id=p_youtube_id) then
  raise exception 'This video already exists. Resume its original import or edit its saved transcript instead.';
 end if;
 insert into public.youtube_transcripts(youtube_id,canonical_url,title,channel,thumbnail,provider,status,
  searchable,feed_eligible,lease_id,lease_until,next_attempt_at,duration_seconds,source_origin)
 values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id,btrim(p_title),
  coalesce(nullif(btrim(p_channel),''),'Unknown channel'),'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg',
  'manual','indexing',false,false,job_id,'infinity','infinity',coalesce(p_duration,nullif(max_end,0)),
  'website_admin_transcript') returning id into v;
 insert into transcript_private.manual_import_jobs(id,actor,import_key,transcript_id,source,expected_segments,requested_searchable)
 values(job_id,p_actor,p_key,v,p_raw,jsonb_array_length(p_raw->'content'),p_searchable);
 insert into public.admin_manual_transcripts(transcript_id,group_id) values(v,p_group);
 return transcript_private.manual_import_state(p_actor,job_id);
end $$;

-- Scope dictionary aggregation to the current batch's surfaces and their lemmas.
create function transcript_private.enrich_import_token_range(p_id uuid,p_first integer,p_last integer) returns void
language sql security definer set search_path='' as $$
 with wanted as materialized (
  select distinct k.normalised from public.transcript_tokens k join public.transcript_segments s on s.id=k.segment_id
  where s.transcript_id=p_id and s.position between p_first and p_last
 ), preferred as materialized (
  select l.* from transcript_private.lexicon l join wanted w using(normalised)
  where l.source<>'hans_wehr' or not exists(select 1 from transcript_private.lexicon c where c.normalised=l.normalised and c.source<>'hans_wehr')
 ), fallback as (
  select normalised,case when count(distinct nullif(root,''))=1 then min(nullif(root,'')) end root
  from transcript_private.lexicon where normalised in(select lemma from preferred) group by normalised
 ), mapping as (
  select p.normalised,case when count(distinct p.lemma)=1 then min(p.lemma) end lemma,
   case when count(distinct coalesce(nullif(p.root,''),f.root))=1 then min(coalesce(nullif(p.root,''),f.root)) end root
  from preferred p left join fallback f on f.normalised=p.lemma group by p.normalised
 ) update public.transcript_tokens k set lemma=m.lemma,root=m.root from mapping m,public.transcript_segments s
 where k.normalised=m.normalised and k.segment_id=s.id and s.transcript_id=p_id and s.position between p_first and p_last;
$$;

create function transcript_private.append_manual_import(p_actor uuid,p_import uuid,p_offset integer,p_limit integer,p_bytes integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j transcript_private.manual_import_jobs; batch jsonb; count_rows integer; token_rows integer;
 total integer; usable integer; canonical_count integer; problems jsonb; last_offset numeric; next_offset numeric;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 100
  or p_bytes is null or p_bytes not between 16384 and 1048576 then raise exception 'Invalid batch bounds';end if;
 select * into j from transcript_private.manual_import_jobs where id=p_import and actor=p_actor for update;
 if not found then raise exception 'Import not found';end if;
 if exists(select 1 from transcript_private.manual_import_batches where import_id=p_import and first_position=p_offset)
  then return transcript_private.manual_import_state(p_actor,p_import);end if;
 if j.completed then return transcript_private.manual_import_state(p_actor,p_import);end if;
 if p_offset<>j.committed_segments then raise exception 'Unexpected import checkpoint; refresh progress';end if;
 if p_offset>=j.expected_segments then return transcript_private.manual_import_state(p_actor,p_import);end if;
 -- Slice once; byte-aware sizing admits at least one intact segment, never truncates tokens.
 with candidate as (
  select c,ord,sum(octet_length(c::text)) over(order by ord) bytes
  from jsonb_array_elements(j.source->'content') with ordinality a(c,ord)
  where ord>p_offset and ord<=p_offset+p_limit
 ) select jsonb_agg(c order by ord) into batch from candidate where bytes<=p_bytes or ord=p_offset+1;
 count_rows:=jsonb_array_length(batch);
 last_offset:=(batch->(count_rows-1)->>'offset')::numeric;
 select min((x->>'offset')::numeric) into next_offset from jsonb_array_elements(j.source->'content') x
  where (x->>'offset')::numeric>last_offset;
 with starts as (select c,ord,lead((c->>'offset')::float8) over(order by ord) next_start
  from jsonb_array_elements(batch) with ordinality a(c,ord))
 insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,normalised_text,english_text)
 select j.transcript_id,p_offset+ord-1,(c->>'offset')::float8/1000,
  case when c->>'duration' is not null then ((c->>'offset')::float8+(c->>'duration')::float8)/1000
   else coalesce((select min((b->>'offset')::float8) from jsonb_array_elements(batch) b where (b->>'offset')::numeric>(c->>'offset')::numeric),next_offset::float8)/1000 end,
  c->>'text',public.normalise_transcript_word(c->>'text'),c->>'english' from starts;
 insert into public.transcript_tokens(segment_id,position,surface,normalised)
 select s.id,ord-1,parts[1],public.normalise_transcript_word(parts[1]) from public.transcript_segments s
 cross join lateral regexp_matches(s.original_text,'([^[:space:]]+)','g') with ordinality a(parts,ord)
 where s.transcript_id=j.transcript_id and s.position>=p_offset and s.position<p_offset+count_rows
  and public.normalise_transcript_word(parts[1])<>'';
 get diagnostics token_rows=row_count;
 -- Project only complete enrichment, exactly as the source-first contract does.
 with items as materialized (select c,p_offset+ord-1 pos from jsonb_array_elements(batch) with ordinality a(c,ord)),
 projected as (
  select i.pos,i.c,t.total,t.usable,t.tokens from items i cross join lateral (
   select count(*)::int total,count(*) filter(where transcript_private.usable_manual_token(w))::int usable,
    jsonb_agg(jsonb_build_object('arabic',coalesce(w->>'ar',w->>'arabic',w->>'surface'),
     'english',coalesce(w->>'english',w->>'gloss'),'pos',coalesce(w->>'pos',w->>'POS'),
     'headword',w->'headword','entry_type',w->>'entry_type','transliteration',w->>'transliteration') order by ord) tokens
   from jsonb_array_elements(case when jsonb_typeof(i.c->'tokens')='array' then i.c->'tokens' else '[]'::jsonb end) with ordinality a(w,ord)
  ) t
 ) update public.transcript_segments s set canonical_paragraph=jsonb_build_object('tokens',p.tokens,
  'translation',coalesce(p.c->>'english',''),'timestamp',transcript_private.manual_awm_timestamp((p.c->>'offset')::float8/1000),
  'paragraph',p.pos+1) from projected p where s.transcript_id=j.transcript_id and s.position=p.pos and p.total>0 and p.total=p.usable;
 get diagnostics canonical_count=row_count;
 select count(*)::int,count(*) filter(where transcript_private.usable_manual_token(w))::int into total,usable
 from jsonb_array_elements(batch) c cross join lateral jsonb_array_elements(case when jsonb_typeof(c->'tokens')='array' then c->'tokens' else '[]'::jsonb end) w;
 with items as (select c,p_offset+ord pos from jsonb_array_elements(batch) with ordinality a(c,ord)), issues as (
  select jsonb_build_object('segment',pos,'token',ord,'reason','Optional enrichment unavailable; original source retained') problem
  from items cross join lateral jsonb_array_elements(case when jsonb_typeof(c->'tokens')='array' then c->'tokens' else '[]'::jsonb end) with ordinality a(w,ord)
  where not transcript_private.usable_manual_token(w)
  union all select jsonb_build_object('segment',pos,'reason','Optional token enrichment absent or unsupported; original source retained')
  from items where jsonb_typeof(c->'tokens') is distinct from 'array'
 ) select coalesce(jsonb_agg(problem),'[]'::jsonb) into problems from issues;
 begin perform transcript_private.enrich_import_token_range(j.transcript_id,p_offset,p_offset+count_rows-1);
 exception when data_exception or raise_exception or undefined_function or undefined_table or insufficient_privilege then
  problems:=problems||jsonb_build_array(jsonb_build_object('operation','dictionary enrichment','sqlstate',sqlstate,'reason',sqlerrm));end;
 insert into transcript_private.manual_import_batches(import_id,first_position,segment_count,search_tokens,diagnostics)
 values(p_import,p_offset,count_rows,token_rows,problems);
 update transcript_private.manual_import_jobs set committed_segments=committed_segments+count_rows,
  search_tokens=search_tokens+token_rows,enrichment_total=enrichment_total+total,enrichment_usable=enrichment_usable+usable,
  canonical_segments=canonical_segments+canonical_count,updated_at=now() where id=p_import;
 return transcript_private.manual_import_state(p_actor,p_import);
end $$;

create function transcript_private.finish_manual_import(p_actor uuid,p_import uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j transcript_private.manual_import_jobs; problems jsonb; enrichment text;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select * into j from transcript_private.manual_import_jobs where id=p_import and actor=p_actor for update;
 if not found then raise exception 'Import not found';end if;
 if j.completed then return transcript_private.manual_import_state(p_actor,p_import);end if;
 perform 1 from public.youtube_transcripts where id=j.transcript_id and status='indexing'
  and lease_id=j.id and not searchable for update;
 if not found then raise exception 'Import record was changed; publication blocked';end if;
 if j.committed_segments<>j.expected_segments or
  (select count(*) from public.transcript_segments where transcript_id=j.transcript_id)<>j.expected_segments or
  (select count(*) from public.transcript_tokens k join public.transcript_segments s on s.id=k.segment_id where s.transcript_id=j.transcript_id)<>j.search_tokens or
  (select count(*) from public.transcript_segments where transcript_id=j.transcript_id and canonical_paragraph is not null)<>j.canonical_segments or
  (select count(*) from jsonb_array_elements(j.source->'content') c
   cross join lateral regexp_matches(c->>'text','([^[:space:]]+)','g') a(parts)
   where public.normalise_transcript_word(parts[1])<>'')<>j.search_tokens
  then raise exception 'Import verification failed: expected segments or tokens are missing';end if;
 if exists(select 1 from jsonb_array_elements(j.source->'content') with ordinality a(c,ord)
  left join public.transcript_segments s on s.transcript_id=j.transcript_id and s.position=ord-1
  where s.id is null or s.original_text is distinct from c->>'text' or s.english_text is distinct from c->>'english'
   or s.start_seconds is distinct from (c->>'offset')::float8/1000
   or (c->>'duration' is not null and s.end_seconds is distinct from ((c->>'offset')::float8+(c->>'duration')::float8)/1000))
  then raise exception 'Import verification failed: source order, text or timestamps changed';end if;
 select coalesce(jsonb_agg(problem),'[]'::jsonb) into problems from transcript_private.manual_import_batches b
 cross join lateral jsonb_array_elements(b.diagnostics) problem where b.import_id=p_import;
 enrichment:=case when j.enrichment_usable=0 then 'unavailable'
  when j.enrichment_usable=j.enrichment_total and j.canonical_segments=j.expected_segments and jsonb_array_length(problems)=0 then 'ready' else 'partial' end;
 insert into transcript_private.manual_sources(transcript_id,original_json,source,enrichment_status,diagnostics)
 values(j.transcript_id,j.source->>'_source_json',j.source-'_source_json',enrichment,problems);
 update public.youtube_transcripts set raw_transcript=j.source-'_source_json',status='ready',searchable=j.requested_searchable,
  translation_status=case when not exists(select 1 from public.transcript_segments where transcript_id=j.transcript_id and english_text is null) then 'ready'
   when exists(select 1 from public.transcript_segments where transcript_id=j.transcript_id and english_text is not null) then 'partial' else 'unavailable' end,
  lease_id=null,lease_until=null,next_attempt_at=now(),updated_at=now(),error_code=null where id=j.transcript_id;
 insert into transcript_private.for_you_classification_queue(transcript_id,restore_feed_eligible) values(j.transcript_id,true)
 on conflict(transcript_id) do update set restore_feed_eligible=true;
 update transcript_private.manual_import_jobs set completed=true,updated_at=now() where id=p_import;
 return transcript_private.manual_import_state(p_actor,p_import)||jsonb_build_object('enrichment',enrichment);
end $$;

create function public.admin_begin_manual_import(p_actor uuid,p_key text,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_group uuid default null,p_duration double precision default null) returns jsonb
 language sql security invoker set search_path='' as $$select transcript_private.begin_manual_import(p_actor,p_key,p_youtube_id,p_title,p_channel,p_raw,p_searchable,p_group,p_duration)$$;
create function public.admin_append_manual_import(p_actor uuid,p_import uuid,p_offset integer,p_limit integer default 100,p_bytes integer default 524288) returns jsonb
 language sql security invoker set search_path='' as $$select transcript_private.append_manual_import(p_actor,p_import,p_offset,p_limit,p_bytes)$$;
create function public.admin_manual_import_state(p_actor uuid,p_import uuid) returns jsonb
 language sql security invoker set search_path='' as $$select transcript_private.manual_import_state(p_actor,p_import)$$;
create function public.admin_finish_manual_import(p_actor uuid,p_import uuid) returns jsonb
 language sql security invoker set search_path='' as $$select transcript_private.finish_manual_import(p_actor,p_import)$$;

-- Fix the existing deployed importer too: its manual path must never perform
-- cross-transcript theme comparison inside the write transaction.
create or replace function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void
language plpgsql security definer set search_path='' as $$
declare eligible boolean;
begin
 select feed_eligible into eligible from public.youtube_transcripts where id=p_id;
 perform public.index_youtube_transcript_before_for_you(p_id,p_lease);
 if transcript_private.manual_transcript_allowed(p_id) then
  update public.youtube_transcripts set feed_eligible=false where id=p_id;
  insert into transcript_private.for_you_classification_queue(transcript_id,restore_feed_eligible) values(p_id,coalesce(eligible,false))
  on conflict(transcript_id) do update set restore_feed_eligible=transcript_private.for_you_classification_queue.restore_feed_eligible or excluded.restore_feed_eligible;
 else perform transcript_private.classify_for_you(p_id);end if;
end $$;

-- Administrators can resume a staged row without reuploading its stored source.
create function transcript_private.resume_manual_import(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare job uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select id into job from transcript_private.manual_import_jobs where transcript_id=p_id and actor=p_actor;
 if job is null then raise exception 'No resumable import owned by this administrator';end if;
 return transcript_private.manual_import_state(p_actor,job);
end $$;
create function public.admin_resume_manual_import(p_actor uuid,p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select transcript_private.resume_manual_import(p_actor,p_id)$$;
revoke all on function transcript_private.resume_manual_import(uuid,uuid),public.admin_resume_manual_import(uuid,uuid) from public,anon,authenticated;
grant execute on function transcript_private.resume_manual_import(uuid,uuid),public.admin_resume_manual_import(uuid,uuid) to service_role;

-- Role-checked private implementations; public wrappers never run as owner.
revoke all on function transcript_private.manual_import_state(uuid,uuid),transcript_private.begin_manual_import(uuid,text,text,text,text,jsonb,boolean,uuid,double precision),transcript_private.append_manual_import(uuid,uuid,integer,integer,integer),transcript_private.finish_manual_import(uuid,uuid),transcript_private.enrich_import_token_range(uuid,integer,integer) from public,anon,authenticated;
grant execute on function transcript_private.manual_import_state(uuid,uuid),transcript_private.begin_manual_import(uuid,text,text,text,text,jsonb,boolean,uuid,double precision),transcript_private.append_manual_import(uuid,uuid,integer,integer,integer),transcript_private.finish_manual_import(uuid,uuid),transcript_private.enrich_import_token_range(uuid,integer,integer) to service_role;
revoke all on function public.admin_begin_manual_import(uuid,text,text,text,text,jsonb,boolean,uuid,double precision),public.admin_append_manual_import(uuid,uuid,integer,integer,integer),public.admin_manual_import_state(uuid,uuid),public.admin_finish_manual_import(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_begin_manual_import(uuid,text,text,text,text,jsonb,boolean,uuid,double precision),public.admin_append_manual_import(uuid,uuid,integer,integer,integer),public.admin_manual_import_state(uuid,uuid),public.admin_finish_manual_import(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION transcript_private.classify_for_you(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_cohort text; v_old_cohort text;
begin
 -- Serialise classification jobs, without taking a lock in the read-only feed.
 perform pg_advisory_xact_lock(hashtextextended('for_you_classification',0));
 select cohort into v_old_cohort from transcript_private.intro_windows where transcript_id=p_id limit 1;
 select coalesce(nullif(source_channel_id,''),nullif(lower(btrim(channel)),'')) into v_cohort
 from public.youtube_transcripts where id=p_id;
 update public.transcript_segments s set
   for_you_fingerprints=transcript_private.for_you_hashes(s.original_text),
   for_you_music_only=lower(btrim(s.original_text)) ~
     '^([[:space:]\[\]()♪♫]|music|instrumental|intro music|theme music|موسيقى|موسيقي|موسيقا|اغنية البداية|أغنية البداية|تصفيق)+$'
 where s.transcript_id=p_id;
 if v_cohort is null then
   update public.transcript_segments set for_you_theme_score=0
   where transcript_id=p_id and for_you_theme_score<>0;
 end if;
 delete from transcript_private.intro_windows where transcript_id=p_id;
 if v_cohort is not null then
   insert into transcript_private.intro_windows(transcript_id,anchor_id,cohort,segment_ids,fingerprints,window_size)
   select p_id,s.id,v_cohort,w.ids,transcript_private.for_you_hashes(w.words),sizes.n
   from public.transcript_segments s cross join (values(3),(6),(12)) sizes(n) cross join lateral (
     select array_agg(n.id order by n.start_seconds,n.position,n.id) ids,
       string_agg(n.original_text,' ' order by n.start_seconds,n.position,n.id) words,
       max(n.end_seconds)-min(n.start_seconds) duration,
       max(n.gap) gap
     from (select x.*, x.start_seconds-lag(x.end_seconds) over(order by x.start_seconds,x.position,x.id) gap
       from (select x.* from public.transcript_segments x
         where x.transcript_id=p_id and (x.start_seconds,x.position,x.id)>=(s.start_seconds,s.position,s.id)
           and x.start_seconds<s.start_seconds+60 and not x.for_you_music_only
         order by x.start_seconds,x.position,x.id limit sizes.n) x) n
   ) w
   where s.transcript_id=p_id and s.start_seconds<=120
     and w.duration between 8 and 60 and coalesce(w.gap,0)<=2
     and cardinality(regexp_split_to_array(public.normalise_transcript_word(w.words),' +'))>=12
     and cardinality(transcript_private.for_you_hashes(w.words))>=4;
 end if;
 -- Expand each fingerprint array once and compare matching hashes set-wise.
 -- Existing hashes are unique: shared-count and the 80% / two-peer thresholds
 -- are identical to the old classifier, without repeated toasted-array lookups.
 with samples as materialized (
   select row_number() over() wid,transcript_id,cohort,segment_ids,cardinality(fingerprints) n,fingerprints
   from transcript_private.intro_windows where cohort in(v_cohort,v_old_cohort)
 ), fingerprints as materialized (
   select s.wid,s.transcript_id,s.cohort,s.n,f from samples s cross join lateral unnest(s.fingerprints) f
 ), matching as materialized (
   select a.wid aw,b.wid bw,a.transcript_id at,b.transcript_id bt
   from fingerprints a join fingerprints b on a.cohort=b.cohort and a.f=b.f
     and a.transcript_id<>b.transcript_id and a.wid<b.wid
   group by a.wid,b.wid,a.transcript_id,b.transcript_id,a.n,b.n
   having count(*)>=0.8*greatest(a.n,b.n)
 ), peers as (
   select aw wid,bt transcript_id from matching union all select bw,at from matching
 ), windows as materialized (
   select s.segment_ids from samples s join
    (select wid from peers group by wid having count(distinct transcript_id)>=2) p using(wid)
 ), flagged as materialized (select distinct unnest(segment_ids) id from windows),
 targets as materialized (
   select s.id,case when f.id is null then 0::real else 0.95::real end score
   from public.youtube_transcripts t join public.transcript_segments s on s.transcript_id=t.id
   left join flagged f on f.id=s.id
   where coalesce(nullif(t.source_channel_id,''),nullif(lower(btrim(t.channel)),'')) in(v_cohort,v_old_cohort)
 )
 update public.transcript_segments s set for_you_theme_score=t.score
 from targets t where s.id=t.id and s.for_you_theme_score is distinct from t.score;
 perform transcript_private.exclude_best_stories_intro(p_id);
update public.youtube_transcripts set feed_eligible=true
 where id=p_id and status='ready' and exists(select 1 from transcript_private.for_you_classification_queue
   where transcript_id=p_id and restore_feed_eligible);
delete from transcript_private.for_you_classification_queue where transcript_id=p_id;
end $function$
;

notify pgrst,'reload schema';
commit;
