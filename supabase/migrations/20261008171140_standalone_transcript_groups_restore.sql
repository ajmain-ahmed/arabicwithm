-- Restore listing from real standalone records; assignment rows are optional.
-- Manual admin organisation is separate from canonical/public transcript storage.
begin;
create table if not exists public.transcript_groups (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 150),
 parent_id uuid references public.transcript_groups(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(parent_id is distinct from id)
);
create unique index if not exists transcript_groups_sibling_name on public.transcript_groups(coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(btrim(name)));
create index if not exists transcript_groups_parent on public.transcript_groups(parent_id);
create table if not exists public.admin_manual_transcripts (
 transcript_id uuid primary key references public.youtube_transcripts(id) on delete cascade,
 group_id uuid references public.transcript_groups(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index if not exists admin_manual_transcripts_group on public.admin_manual_transcripts(group_id);
alter table public.transcript_groups enable row level security;
alter table public.admin_manual_transcripts enable row level security;
revoke all on public.transcript_groups,public.admin_manual_transcripts from public,anon,authenticated;
grant all on public.transcript_groups,public.admin_manual_transcripts to service_role;
create or replace function transcript_private.manual_transcript_allowed(p_id uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.youtube_transcripts t where t.id=p_id and t.provider='manual'
 and t.source_origin='website_admin_transcript' and t.episode_id is null
 and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id));
$$;

-- Display text and JSON are never normalised: this key is only for title/name matching.
create or replace function transcript_private.normalise_admin_title(input text) returns text language sql immutable parallel safe set search_path='' as $$
 select btrim(regexp_replace(lower(translate(regexp_replace(normalize(coalesce(input,''),NFKC),
 U&'[\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]','','g'),U&'\0623\0625\0622\0671\0649\06CC\06A9',U&'\0627\0627\0627\0627\064A\064A\0643')),
 '[^[:alnum:]]+',' ','g'));
$$;

create or replace function public.admin_list_manual_transcripts(p_actor uuid,p_page integer default 0,p_search text default '',p_group uuid default null,p_ungrouped boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; needle text:=transcript_private.normalise_admin_title(p_search);
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_page is null or p_page<0 or p_page>100000 or length(coalesce(p_search,''))>300 then raise exception 'Invalid search'; end if;
 with eligible as materialized (
  select t.id,t.youtube_id,t.canonical_url,t.title,t.channel,t.thumbnail,t.duration_seconds,t.provider,t.status,t.translation_status,t.searchable,t.created_at,t.updated_at,t.error_code,m.group_id
  from public.youtube_transcripts t left join public.admin_manual_transcripts m on m.transcript_id=t.id
  where t.provider='manual' and t.source_origin='website_admin_transcript' and t.episode_id is null
  and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
 ), filtered as materialized (
  select t.* from eligible t left join public.transcript_groups g on g.id=t.group_id 
  where (not p_ungrouped or t.group_id is null)
  and (p_group is null or t.group_id=p_group)
  and (needle='' or strpos(transcript_private.normalise_admin_title(t.title),needle)>0
   or strpos(transcript_private.normalise_admin_title(g.name),needle)>0)
 ), paged as (
  select * from filtered order by created_at desc,id offset p_page*30 limit 30
 ), groups as (
  select g.id,g.name,g.parent_id,count(t.id)::integer direct_count,count(t.id)::integer transcript_count
  from public.transcript_groups g left join eligible t on t.group_id=g.id group by g.id
 )
 select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object(
  'id',id,'youtube_id',youtube_id,'canonical_url',canonical_url,'title',title,'channel',channel,'thumbnail',thumbnail,
  'duration_seconds',duration_seconds,'provider',provider,'status',status,'translation_status',translation_status,
  'searchable',searchable,'created_at',created_at,'updated_at',updated_at,'error_code',error_code,'group_id',group_id) order by created_at desc,id) from paged),'[]'::jsonb),
  'total',(select count(*) from filtered),'groups',coalesce((select jsonb_agg(to_jsonb(g) order by name,id) from groups g),'[]'::jsonb),
  'ungrouped',(select count(*) from eligible where group_id is null)) into result;
 return result;
end $$;

create or replace function public.admin_manage_transcript_group(p_actor uuid,p_name text default null,p_parent uuid default null,p_id uuid default null,p_delete boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(82741602);
 if p_delete then
  delete from public.transcript_groups where id=p_id returning id into result;
 elsif p_id is null then
  insert into public.transcript_groups(name,parent_id) values(p_name,null) returning id into result;
 else
  -- Renaming preserves hierarchy; moving transcripts is done in Edit.
  update public.transcript_groups set name=p_name where id=p_id returning id into result;
 end if;
 if result is null then raise exception 'Group no longer exists'; end if;
 return result;
end $$;

create or replace function public.admin_import_grouped_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_group uuid default null,p_duration double precision default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 if exists(select 1 from public.youtube_transcripts where youtube_id=p_youtube_id) then
  raise exception 'This video already exists. Edit its saved transcript instead of importing again.'; end if;
 result:=public.admin_import_youtube_transcript(p_actor,p_youtube_id,p_title,p_channel,p_raw,p_searchable);
 if not transcript_private.manual_transcript_allowed(result) then raise exception 'This video belongs to Shows or another import workflow'; end if;
 insert into public.admin_manual_transcripts(transcript_id,group_id) values(result,p_group);
 if p_duration is not null then
  if p_duration<=0 or p_duration>43200 or p_duration='NaN'::float8 or p_duration<(select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x) then raise exception 'Video duration ends before the transcript'; end if;
  update public.youtube_transcripts set duration_seconds=p_duration where id=result;
 end if;
 return result;
end $$;

create or replace function transcript_private.validate_standalone_transcript_json(p_raw jsonb) returns void
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
revoke all on function transcript_private.validate_standalone_transcript_json(jsonb) from public,anon,authenticated;
grant execute on function transcript_private.validate_standalone_transcript_json(jsonb) to service_role;

create or replace function public.admin_move_standalone_transcript(p_actor uuid,p_id uuid,p_group uuid,p_previous_group uuid,p_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare current_version timestamptz; current_group uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,82741603));
 select updated_at into current_version from public.youtube_transcripts where id=p_id for update;
 if not found or not transcript_private.manual_transcript_allowed(p_id) then raise exception 'Only manual transcripts can be edited here'; end if;
 if p_updated_at is null or current_version is distinct from p_updated_at then raise exception 'transcript_edit_conflict'; end if;
 select group_id into current_group from public.admin_manual_transcripts where transcript_id=p_id for update;
 if current_group is distinct from p_previous_group then raise exception 'transcript_group_conflict'; end if;
 if current_group is distinct from p_group then
  insert into public.admin_manual_transcripts(transcript_id,group_id) values(p_id,p_group)
   on conflict(transcript_id) do update set group_id=excluded.group_id;
 end if;
 -- Transcript metadata, JSON, child rows and updated_at deliberately stay intact.
 return current_version;
end $$;

create or replace function public.admin_save_grouped_transcript(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz,p_youtube_id text,p_group uuid default null,p_duration double precision default null) returns timestamptz
language plpgsql security definer set search_path='' as $$
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
end $$;
revoke all on function public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean),public.admin_manage_transcript_group(uuid,text,uuid,uuid,boolean),public.admin_import_grouped_transcript(uuid,text,text,text,jsonb,boolean,uuid,double precision),public.admin_save_grouped_transcript(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,double precision) from public,anon,authenticated;
grant execute on function public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean),public.admin_manage_transcript_group(uuid,text,uuid,uuid,boolean),public.admin_import_grouped_transcript(uuid,text,text,text,jsonb,boolean,uuid,double precision),public.admin_save_grouped_transcript(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,double precision) to service_role;
revoke all on function public.admin_move_standalone_transcript(uuid,uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_move_standalone_transcript(uuid,uuid,uuid,uuid,timestamptz) to service_role;
revoke all on function transcript_private.manual_transcript_allowed(uuid),transcript_private.normalise_admin_title(text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
