-- Website-only ingestion mode; existing mobile/curated/manual rows are unchanged.
alter table public.youtube_transcripts add column website_generation boolean not null default false;
-- Add millisecond access to the existing segment model, retaining seconds for
-- existing app clients. Provider millisecond integers remain in raw_transcript.
alter table public.transcript_segments
  add column start_ms integer generated always as (round(start_seconds * 1000)::integer) stored,
  add column end_ms integer generated always as (round(end_seconds * 1000)::integer) stored;

create function public.admin_generate_youtube_transcript(p_actor uuid,p_youtube_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
  if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
  if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'invalid_request'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
  select id into v from public.youtube_transcripts where youtube_id=p_youtube_id;
  if found then return jsonb_build_object('id',v,'duplicate',true); end if;
  -- Reuse canonical registration, quotas, library ownership, and cron queue.
  v:=public.register_youtube_transcript(p_actor,p_youtube_id);
  update public.youtube_transcripts set website_generation=true,provider='supadata',
    searchable=false,feed_eligible=false where id=v;
  return jsonb_build_object('id',v,'duplicate',false);
end $$;
revoke all on function public.admin_generate_youtube_transcript(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_generate_youtube_transcript(uuid,text) to service_role;

create function public.admin_delete_youtube_transcript(p_actor uuid,p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
  -- Existing FK cascades own segments, tokens, translations, guest capabilities,
  -- and user-library associations. Shared dictionary/lexicon data is untouched.
  delete from public.youtube_transcripts where id=p_id;
  return found;
end $$;
revoke all on function public.admin_delete_youtube_transcript(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_delete_youtube_transcript(uuid,uuid) to service_role;

alter function public.index_youtube_transcript(uuid,uuid) rename to index_youtube_transcript_legacy;
create function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void
language plpgsql security definer set search_path='' as $$
declare raw jsonb; generated boolean; c jsonb;
begin
  select raw_transcript,website_generation into raw,generated from public.youtube_transcripts
    where id=p_id and lease_id=p_lease for update;
  if not found then raise exception 'lease_lost'; end if;
  if not generated then perform public.index_youtube_transcript_legacy(p_id,p_lease); return; end if;
  if raw is null or jsonb_typeof(raw->'content') is distinct from 'array'
    or jsonb_array_length(raw->'content') not between 1 and 100000 then raise exception 'malformed_transcript'; end if;
  for c in select value from jsonb_array_elements(raw->'content') loop
    if jsonb_typeof(c->'text') is distinct from 'string' or nullif(btrim(c->>'text'),'') is null
      or jsonb_typeof(c->'offset') is distinct from 'number' or jsonb_typeof(c->'duration') is distinct from 'number'
      then raise exception 'malformed_transcript'; end if;
    if (c->>'offset')::numeric<0 or (c->>'duration')::numeric<=0
      or trunc((c->>'offset')::numeric)<>(c->>'offset')::numeric
      or trunc((c->>'duration')::numeric)<>(c->>'duration')::numeric
      or (c->>'offset')::numeric+(c->>'duration')::numeric>43200000 then raise exception 'invalid_timing'; end if;
  end loop;
  if coalesce(raw->>'lang','ar')<>'ar' or not exists(select 1 from jsonb_array_elements(raw->'content') x
    where x->>'text' ~ U&'[\0621-\063A\0641-\064A]') then raise exception 'arabic_unavailable'; end if;
  -- Idempotent source indexing. Never replace an already translated source.
  if exists(select 1 from public.transcript_segments where transcript_id=p_id) then
    if (select count(*) from public.transcript_segments where transcript_id=p_id)<>jsonb_array_length(raw->'content')
      or exists(with ordered as (select x,row_number() over(order by (x->>'offset')::integer,ord)-1 pos
        from jsonb_array_elements(raw->'content') with ordinality a(x,ord))
        select 1 from ordered o left join public.transcript_segments s on s.transcript_id=p_id and s.position=o.pos
        where s.id is null or s.start_ms<>(o.x->>'offset')::integer
          or s.end_ms<>(o.x->>'offset')::integer+(o.x->>'duration')::integer or s.original_text<>o.x->>'text')
      then raise exception 'translated_source_changed'; end if;
  else
    insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,normalised_text)
      select p_id,(row_number() over(order by (x->>'offset')::integer,ord)-1)::integer,
        (x->>'offset')::integer/1000.0,((x->>'offset')::integer+(x->>'duration')::integer)/1000.0,
        x->>'text',public.normalise_transcript_word(x->>'text')
      from jsonb_array_elements(raw->'content') with ordinality a(x,ord);
  end if;
  -- No tokens, dictionary lookup, POS or CEFR enrichment for this mode.
  update public.youtube_transcripts set status='ready',error_code=null,lease_id=null,lease_until=null,updated_at=now()
    where id=p_id;
end $$;
revoke all on function public.index_youtube_transcript(uuid,uuid) from public,anon,authenticated;
grant execute on function public.index_youtube_transcript(uuid,uuid) to service_role;

create or replace function transcript_private.queue_translation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.provider='supadata' and new.status='ready' and (new.episode_id is null or new.website_generation)
    and new.raw_transcript is not null and exists(select 1 from public.transcript_segments s
      where s.transcript_id=new.id and nullif(s.english_text,'') is null) then
    insert into transcript_private.translations(transcript_id,source_hash)
      values(new.id,md5(new.raw_transcript::text)) on conflict do nothing;
    update public.youtube_transcripts t set translation_status=j.status
      from transcript_private.translations j where t.id=new.id and j.transcript_id=t.id;
  end if;
  return new;
end $$;

create function transcript_private.publish_website_generation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.website_generation and new.status='ready' and new.translation_status='ready'
    and exists(select 1 from public.transcript_segments where transcript_id=new.id)
    and not exists(select 1 from public.transcript_segments where transcript_id=new.id and nullif(btrim(english_text),'') is null)
    then new.searchable:=true; new.feed_eligible:=true; end if;
  return new;
end $$;
create trigger website_generation_ready before update of translation_status on public.youtube_transcripts
  for each row execute function transcript_private.publish_website_generation();
revoke all on function transcript_private.publish_website_generation() from public,anon,authenticated;

create function transcript_private.check_website_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.website_generation and new.searchable and (new.status<>'ready' or new.translation_status<>'ready'
    or not exists(select 1 from public.transcript_segments where transcript_id=new.id)
    or exists(select 1 from public.transcript_segments where transcript_id=new.id and nullif(btrim(english_text),'') is null))
    then raise exception 'generation_incomplete'; end if;
  return new;
end $$;
create trigger website_publication_guard before insert or update of searchable,status,website_generation on public.youtube_transcripts
  for each row execute function transcript_private.check_website_publication();
revoke all on function transcript_private.check_website_publication() from public,anon,authenticated;

create function transcript_private.website_translation_error() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.youtube_transcripts set error_code=new.error_code,updated_at=now()
    where id=new.transcript_id and website_generation;
  return new;
end $$;
create trigger website_translation_error after insert or update of status,error_code on transcript_private.translations
  for each row execute function transcript_private.website_translation_error();
revoke all on function transcript_private.website_translation_error() from public,anon,authenticated;

-- Extend the SAME ranked, cursor-based search RPC with plain segment text.
-- The legacy token/lemma/root path and existing clients keep their contract.
alter function public.search_transcript_word(text,bigint,integer,integer) rename to search_transcript_word_legacy;
create function public.search_transcript_word(p_word text,p_after bigint default 0,p_limit integer default 20,p_after_rank integer default 0)
returns table(segment_id bigint,transcript_id uuid,youtube_id text,title text,channel text,thumbnail text,
  duration_seconds double precision,original_text text,start_seconds double precision,end_seconds double precision,
  matched_surfaces text[],previous_text text,next_text text,previous_start double precision,next_end double precision,
  match_type text,match_rank integer,english_text text)
language sql stable security definer set search_path='' as $$
  with q as (select public.normalise_transcript_word(p_word) word where length(p_word) between 1 and 200),
  candidates as (
    select * from public.search_transcript_word_legacy(p_word,p_after,50,p_after_rank)
    union all
    select s.id,t.id,t.youtube_id,t.title,t.channel,t.thumbnail,t.duration_seconds,s.original_text,s.start_seconds,s.end_seconds,
      array[]::text[],prev.original_text,nxt.original_text,prev.start_seconds,nxt.end_seconds,'text'::text,1,s.english_text
    from public.transcript_segments s join public.youtube_transcripts t on t.id=s.transcript_id
    cross join q
    left join public.transcript_segments prev on prev.transcript_id=s.transcript_id and prev.position=s.position-1
    left join public.transcript_segments nxt on nxt.transcript_id=s.transcript_id and nxt.position=s.position+1
    where t.website_generation and t.status='ready' and t.searchable and q.word<>''
      and (position(q.word in s.normalised_text)>0 or position(lower(btrim(p_word)) in lower(s.english_text))>0)
      and (1,s.id)>(greatest(p_after_rank,0),greatest(p_after,0))
    order by match_rank,segment_id limit 50
  ), unique_hits as (select distinct on (segment_id) * from candidates order by segment_id,match_rank)
  select * from unique_hits order by match_rank,segment_id limit least(greatest(p_limit,1),50);
$$;
revoke all on function public.search_transcript_word(text,bigint,integer,integer) from public;
grant execute on function public.search_transcript_word(text,bigint,integer,integer) to anon,authenticated,service_role;
notify pgrst,'reload schema';
