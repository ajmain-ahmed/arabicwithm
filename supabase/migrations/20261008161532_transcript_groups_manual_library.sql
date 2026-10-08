-- Manual admin organisation is separate from canonical/public transcript storage.
begin;
create table public.transcript_groups (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 150),
 parent_id uuid references public.transcript_groups(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(parent_id is distinct from id)
);
create unique index transcript_groups_sibling_name on public.transcript_groups(coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(btrim(name)));
create index transcript_groups_parent on public.transcript_groups(parent_id);
create table public.admin_manual_transcripts (
 transcript_id uuid primary key references public.youtube_transcripts(id) on delete cascade,
 group_id uuid references public.transcript_groups(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index admin_manual_transcripts_group on public.admin_manual_transcripts(group_id);
alter table public.transcript_groups enable row level security;
alter table public.admin_manual_transcripts enable row level security;
revoke all on public.transcript_groups,public.admin_manual_transcripts from public,anon,authenticated;
grant all on public.transcript_groups,public.admin_manual_transcripts to service_role;
-- Only confidently proven manual imports are backfilled. Unknown origins stay untouched.
insert into public.admin_manual_transcripts(transcript_id)
 select t.id from public.youtube_transcripts t where t.provider='manual' and t.source_origin='website_admin_transcript'
 and t.episode_id is null and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id);

create function transcript_private.validate_transcript_group() returns trigger language plpgsql set search_path='' as $$
begin
 -- Serialize hierarchy changes, including concurrent attempts to deepen nesting.
 perform pg_advisory_xact_lock(82741602);
 if new.parent_id is not null and not exists(select 1 from public.transcript_groups where id=new.parent_id and parent_id is null) then
  raise exception 'Subgroups must belong to a main group'; end if;
 if new.parent_id is not null and exists(select 1 from public.transcript_groups where parent_id=new.id) then
  raise exception 'A main group with subgroups cannot become a subgroup'; end if;
 new.name:=btrim(new.name); new.updated_at:=clock_timestamp(); return new;
end $$;
create trigger transcript_group_hierarchy before insert or update on public.transcript_groups for each row execute function transcript_private.validate_transcript_group();

create function transcript_private.manual_transcript_allowed(p_id uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.youtube_transcripts t where t.id=p_id and t.provider='manual'
 and t.source_origin='website_admin_transcript' and t.episode_id is null
 and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id));
$$;

-- Display text and JSON are never normalised: this key is only for title/name matching.
create function transcript_private.normalise_admin_title(input text) returns text language sql immutable parallel safe set search_path='' as $$
 select btrim(regexp_replace(lower(translate(regexp_replace(normalize(coalesce(input,''),NFKC),
 U&'[\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]','','g'),U&'\0623\0625\0622\0671\0649\06CC\06A9',U&'\0627\0627\0627\0627\064A\064A\0643')),
 '[^[:alnum:]]+',' ','g'));
$$;

create function public.admin_list_manual_transcripts(p_actor uuid,p_page integer default 0,p_search text default '',p_group uuid default null,p_ungrouped boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; needle text:=transcript_private.normalise_admin_title(p_search);
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_page is null or p_page<0 or p_page>100000 or length(coalesce(p_search,''))>300 then raise exception 'Invalid search'; end if;
 with eligible as materialized (
  select t.id,t.youtube_id,t.canonical_url,t.title,t.channel,t.thumbnail,t.duration_seconds,t.provider,t.status,t.translation_status,t.searchable,t.created_at,t.updated_at,t.error_code,m.group_id
  from public.admin_manual_transcripts m join public.youtube_transcripts t on t.id=m.transcript_id
  where t.provider='manual' and t.source_origin='website_admin_transcript' and t.episode_id is null
  and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
 ), filtered as materialized (
  select t.* from eligible t left join public.transcript_groups g on g.id=t.group_id left join public.transcript_groups parent on parent.id=g.parent_id
  where (not p_ungrouped or t.group_id is null)
  and (p_group is null or t.group_id=p_group or g.parent_id=p_group)
  and (needle='' or strpos(transcript_private.normalise_admin_title(t.title),needle)>0
   or strpos(transcript_private.normalise_admin_title(g.name),needle)>0 or strpos(transcript_private.normalise_admin_title(parent.name),needle)>0)
 ), paged as (
  select * from filtered order by created_at desc,id offset p_page*30 limit 30
 ), groups as (
  select g.id,g.name,g.parent_id,count(distinct t.id) filter(where t.group_id=g.id)::integer direct_count,count(distinct t.id)::integer transcript_count
  from public.transcript_groups g left join public.transcript_groups children on children.parent_id=g.id
  left join eligible t on t.group_id=g.id or t.group_id=children.id group by g.id
 )
 select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object(
  'id',id,'youtube_id',youtube_id,'canonical_url',canonical_url,'title',title,'channel',channel,'thumbnail',thumbnail,
  'duration_seconds',duration_seconds,'provider',provider,'status',status,'translation_status',translation_status,
  'searchable',searchable,'created_at',created_at,'updated_at',updated_at,'error_code',error_code,'group_id',group_id) order by created_at desc,id) from paged),'[]'::jsonb),
  'total',(select count(*) from filtered),'groups',coalesce((select jsonb_agg(to_jsonb(g) order by name,id) from groups g),'[]'::jsonb),
  'ungrouped',(select count(*) from eligible where group_id is null)) into result;
 return result;
end $$;

create function public.admin_manage_transcript_group(p_actor uuid,p_name text default null,p_parent uuid default null,p_id uuid default null,p_delete boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 perform pg_advisory_xact_lock(82741602);
 if p_delete then
  delete from public.transcript_groups where id=p_id returning id into result;
 elsif p_id is null then
  insert into public.transcript_groups(name,parent_id) values(p_name,p_parent) returning id into result;
 else
  -- Renaming preserves hierarchy; moving transcripts is done in Edit.
  update public.transcript_groups set name=p_name where id=p_id returning id into result;
 end if;
 if result is null then raise exception 'Group no longer exists'; end if;
 return result;
end $$;

create function public.admin_import_grouped_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_group uuid default null,p_duration double precision default null) returns uuid
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

create function public.admin_save_grouped_transcript(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz,p_youtube_id text,p_group uuid default null,p_duration double precision default null) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare result timestamptz;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' then raise exception 'Invalid YouTube video ID'; end if;
 -- Same lock order as the existing JSON editor and translation worker.
 perform 1 from transcript_private.translations where transcript_id=p_id for update;
 perform 1 from public.youtube_transcripts where id=p_id for update;
 if not exists(select 1 from public.admin_manual_transcripts where transcript_id=p_id) or not transcript_private.manual_transcript_allowed(p_id)
 or exists(select 1 from public.episodes where youtube_id=p_youtube_id) then raise exception 'Only manual transcripts can be edited here'; end if;
 result:=public.admin_update_transcript_json(p_actor,p_id,p_raw,p_title,p_channel,p_searchable,p_updated_at);
 update public.admin_manual_transcripts set group_id=p_group where transcript_id=p_id;
 if p_duration is not null and (p_duration<=0 or p_duration>43200 or p_duration='NaN'::float8 or p_duration<(select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x)) then raise exception 'Video duration ends before the transcript'; end if;
 update public.youtube_transcripts set youtube_id=p_youtube_id,canonical_url='https://www.youtube.com/watch?v='||p_youtube_id,
 thumbnail=case when youtube_id<>p_youtube_id then 'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg' else thumbnail end,
 duration_seconds=coalesce(p_duration,duration_seconds),updated_at=clock_timestamp() where id=p_id returning updated_at into result;
 return result;
end $$;

revoke all on function transcript_private.validate_transcript_group(),transcript_private.manual_transcript_allowed(uuid),transcript_private.normalise_admin_title(text) from public,anon,authenticated;
revoke all on function public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean),public.admin_manage_transcript_group(uuid,text,uuid,uuid,boolean),public.admin_import_grouped_transcript(uuid,text,text,text,jsonb,boolean,uuid,double precision),public.admin_save_grouped_transcript(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,double precision) from public,anon,authenticated;
grant execute on function public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean),public.admin_manage_transcript_group(uuid,text,uuid,uuid,boolean),public.admin_import_grouped_transcript(uuid,text,text,text,jsonb,boolean,uuid,double precision),public.admin_save_grouped_transcript(uuid,uuid,jsonb,text,text,boolean,timestamptz,text,uuid,double precision) to service_role;
notify pgrst,'reload schema';
commit;
