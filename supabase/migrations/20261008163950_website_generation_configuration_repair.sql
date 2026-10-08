-- Supersedes the old website-generation migration on databases with the newer
-- canonical indexer. Never replace the indexer, search RPC, or provider worker.
begin;
alter table public.youtube_transcripts add column if not exists website_generation boolean not null default false;
alter table public.transcript_segments add column if not exists start_ms integer generated always as (round(start_seconds*1000)::integer) stored;
alter table public.transcript_segments add column if not exists end_ms integer generated always as (round(end_seconds*1000)::integer) stored;

create or replace function public.admin_generate_youtube_transcript(p_actor uuid,p_youtube_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 select id into result from public.youtube_transcripts where youtube_id=p_youtube_id;
 if found then return jsonb_build_object('id',result,'duplicate',true); end if;
 if nullif(public.transcript_provider_key(),'') is null then raise exception 'provider_not_configured'; end if;
 if exists(select 1 from public.episodes where youtube_id=p_youtube_id) then raise exception 'episode_video'; end if;
 result:=public.register_youtube_transcript(p_actor,p_youtube_id);
 update public.youtube_transcripts set website_generation=true,searchable=false,feed_eligible=false where id=result;
 perform public.admin_record_transcript_origin(p_actor,result);
 return jsonb_build_object('id',result,'duplicate',false);
end $$;

create or replace function public.admin_review_generated_transcript(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_searchable boolean,p_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare previous public.youtube_transcripts; c jsonb; lease uuid:=gen_random_uuid(); last_start numeric:=-1; finish numeric;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 300 or p_searchable is null or p_updated_at is null
 or jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length(p_raw::text)>20971520 then raise exception 'invalid_review'; end if;
 if jsonb_array_length(p_raw->'content')<1 then raise exception 'invalid_review'; end if;
 for c in select value from jsonb_array_elements(p_raw->'content') loop
  if jsonb_typeof(c->'text') is distinct from 'string' or c->>'text' !~ U&'[\0600-\06FF]'
   or jsonb_typeof(c->'offset') is distinct from 'number' or jsonb_typeof(c->'duration') is distinct from 'number' then raise exception 'invalid_review'; end if;
  if (c->>'offset')::numeric<=last_start or (c->>'offset')::numeric<0 or (c->>'duration')::numeric<=0
   or (c->>'offset')::numeric<>trunc((c->>'offset')::numeric) or (c->>'duration')::numeric<>trunc((c->>'duration')::numeric)
   or (c->>'offset')::numeric+(c->>'duration')::numeric>43200000 then raise exception 'invalid_timing'; end if;
  last_start:=(c->>'offset')::numeric;
 end loop;
 perform 1 from transcript_private.translations where transcript_id=p_id for update;
 select * into previous from public.youtube_transcripts where id=p_id for update;
 if not found then raise exception 'transcript_not_found'; end if;
 if previous.source_origin is distinct from 'website_admin_transcript' or previous.provider not in ('supadata','gladia')
 or previous.episode_id is not null or exists(select 1 from public.episodes where youtube_id=previous.youtube_id) then raise exception 'not_generated_transcript'; end if;
 if previous.updated_at is distinct from p_updated_at then raise exception 'transcript_edit_conflict'; end if;
 if previous.status<>'ready' or previous.lease_until>now() then raise exception 'transcript_edit_busy'; end if;
 delete from transcript_private.translations where transcript_id=p_id;
 -- Editing regenerates this transcript's derived rows only; all work is atomic.
 update public.youtube_transcripts set provider='manual',searchable=false,status='indexing',canonical_transcript=null,
  raw_transcript=coalesce(previous.raw_transcript,'{}'::jsonb)||jsonb_build_object('lang','ar','content',p_raw->'content'),
  lease_id=lease,lease_until=now()+interval '3 minutes' where id=p_id;
 delete from public.transcript_segments where transcript_id=p_id;
 perform public.index_youtube_transcript(p_id,lease);
 if not exists(select 1 from public.youtube_transcripts where id=p_id and status='ready') then raise exception 'transcript_index_failed'; end if;
 with source as(select a.c,row_number() over(order by (a.c->>'offset')::numeric,a.ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(c,ord))
 update public.transcript_segments s set english_text=nullif(btrim(o.c->>'english'),'') from source o where s.transcript_id=p_id and s.position=o.pos;
 update public.youtube_transcripts set title=btrim(p_title),provider=previous.provider,searchable=p_searchable,feed_eligible=p_searchable,
  canonical_transcript=case when not exists(select 1 from public.transcript_segments where transcript_id=p_id and canonical_paragraph is null)
   then (select jsonb_agg(canonical_paragraph order by position) from public.transcript_segments where transcript_id=p_id) else null end,
  translation_status=case when not exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is null) then 'ready'
   when exists(select 1 from public.transcript_segments where transcript_id=p_id and english_text is not null) then 'partial' else 'unavailable' end,
  updated_at=clock_timestamp() where id=p_id returning updated_at into previous.updated_at;
 return previous.updated_at;
end $$;
revoke all on function public.admin_generate_youtube_transcript(uuid,text),public.admin_review_generated_transcript(uuid,uuid,jsonb,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_generate_youtube_transcript(uuid,text),public.admin_review_generated_transcript(uuid,uuid,jsonb,text,boolean,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
