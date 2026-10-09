begin;

-- Form drafts accept unfinished input. They never reserve a video, create
-- transcript segments, enqueue ingestion, or enter public transcript searches.
create table transcript_private.manual_form_drafts (
 id uuid primary key, actor uuid not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default clock_timestamp()
);
create index manual_form_drafts_actor_updated_idx on transcript_private.manual_form_drafts(actor,updated_at desc,id);
alter table transcript_private.manual_form_drafts enable row level security;
revoke all on transcript_private.manual_form_drafts from public,anon,authenticated,service_role;

create function transcript_private.save_manual_form_draft(p_actor uuid,p_id uuid,p_payload jsonb,p_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d transcript_private.manual_form_drafts; field text;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid draft';end if;
 foreach field in array array['url','title','channel','json','duration','durationFormat'] loop
  if jsonb_typeof(p_payload->field) is distinct from 'string' then raise exception 'Invalid draft field: %',field;end if;
 end loop;
 if length(p_payload->>'url')>2048 or length(p_payload->>'title')>300 or length(p_payload->>'channel')>300
  or octet_length(p_payload->>'json')>20971520 or length(p_payload->>'duration')>30
  or p_payload->>'durationFormat' not in('clock','minutes')
  or jsonb_typeof(p_payload->'searchable') is distinct from 'boolean'
  or not(p_payload ? 'groupId') or jsonb_typeof(p_payload->'groupId') not in('string','null')
  then raise exception 'Draft input exceeds the supported limits';end if;
 if p_payload->>'groupId' is not null then perform (p_payload->>'groupId')::uuid;end if;
 -- Serialize first-save retries as well as updates to the same draft identifier.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,73));
 select * into d from transcript_private.manual_form_drafts where id=p_id for update;
 if found then
  if d.actor<>p_actor then raise exception 'Forbidden';end if;
  if d.payload=p_payload then return jsonb_build_object('id',d.id,'updatedAt',d.updated_at);end if;
  if p_version is null or d.updated_at is distinct from p_version then raise exception 'draft_conflict';end if;
  update transcript_private.manual_form_drafts set payload=p_payload,updated_at=clock_timestamp() where id=p_id returning * into d;
 else
  if p_version is not null then raise exception 'draft_conflict';end if;
  insert into transcript_private.manual_form_drafts(id,actor,payload) values(p_id,p_actor,p_payload) returning * into d;
 end if;
 return jsonb_build_object('id',d.id,'updatedAt',d.updated_at);
end $$;

create function transcript_private.load_manual_form_draft(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d transcript_private.manual_form_drafts;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select * into d from transcript_private.manual_form_drafts where id=p_id and actor=p_actor;
 if not found then raise exception 'Draft not found';end if;
 return jsonb_build_object('id',d.id,'payload',d.payload,'updatedAt',d.updated_at);
end $$;

create function transcript_private.list_manual_form_drafts(p_actor uuid,p_page integer,p_search text,p_rows boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; total bigint; count_all bigint;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_page is null or p_page not between 0 and 100000 or p_search is null or length(p_search)>300 or p_rows is null then raise exception 'Invalid draft list';end if;
 select count(*) into count_all from transcript_private.manual_form_drafts where actor=p_actor;
 select count(*) into total from transcript_private.manual_form_drafts where actor=p_actor
  and (p_search='' or strpos(lower(coalesce(nullif(payload->>'title',''),'Untitled draft')),lower(p_search))>0);
 if p_rows then
  select coalesce(jsonb_agg(row order by updated_at desc,id),'[]') into result from (
   select id,updated_at,jsonb_build_object('id',id,'draft_id',id,'draft_version',updated_at,
    'youtube_id',payload->>'url','canonical_url','','title',coalesce(nullif(btrim(payload->>'title'),''),'Untitled draft'),
    'channel',nullif(payload->>'channel',''),'thumbnail','','duration_seconds',null,'provider','manual',
    'status','draft','translation_status','unavailable','searchable',false,'created_at',created_at,'updated_at',updated_at,
    'error_code',null,'group_id','drafts') row
   from transcript_private.manual_form_drafts where actor=p_actor
    and (p_search='' or strpos(lower(coalesce(nullif(payload->>'title',''),'Untitled draft')),lower(p_search))>0)
   order by updated_at desc,id limit 30 offset p_page*30
  ) page;
 else result:='[]';end if;
 return jsonb_build_object('rows',result,'total',total,'count',count_all);
end $$;

create function transcript_private.delete_manual_form_draft(p_actor uuid,p_id uuid,p_version timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare d transcript_private.manual_form_drafts;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select * into d from transcript_private.manual_form_drafts where id=p_id and actor=p_actor for update;
 if not found then return true;end if;
 if p_version is null or d.updated_at is distinct from p_version then raise exception 'draft_conflict';end if;
 delete from transcript_private.manual_form_drafts where id=p_id and actor=p_actor;
 return true;
end $$;

create function public.admin_save_manual_draft(p_actor uuid,p_id uuid,p_payload jsonb,p_version timestamptz default null) returns jsonb
language sql security invoker set search_path='' as $$select transcript_private.save_manual_form_draft(p_actor,p_id,p_payload,p_version)$$;
create function public.admin_load_manual_draft(p_actor uuid,p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select transcript_private.load_manual_form_draft(p_actor,p_id)$$;
create function public.admin_list_manual_drafts(p_actor uuid,p_page integer default 0,p_search text default '',p_rows boolean default true) returns jsonb
language sql security invoker set search_path='' as $$select transcript_private.list_manual_form_drafts(p_actor,p_page,p_search,p_rows)$$;
create function public.admin_delete_manual_draft(p_actor uuid,p_id uuid,p_version timestamptz) returns boolean
language sql security invoker set search_path='' as $$select transcript_private.delete_manual_form_draft(p_actor,p_id,p_version)$$;

revoke all on function transcript_private.save_manual_form_draft(uuid,uuid,jsonb,timestamptz),transcript_private.load_manual_form_draft(uuid,uuid),transcript_private.list_manual_form_drafts(uuid,integer,text,boolean),transcript_private.delete_manual_form_draft(uuid,uuid,timestamptz),public.admin_save_manual_draft(uuid,uuid,jsonb,timestamptz),public.admin_load_manual_draft(uuid,uuid),public.admin_list_manual_drafts(uuid,integer,text,boolean),public.admin_delete_manual_draft(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function transcript_private.save_manual_form_draft(uuid,uuid,jsonb,timestamptz),transcript_private.load_manual_form_draft(uuid,uuid),transcript_private.list_manual_form_drafts(uuid,integer,text,boolean),transcript_private.delete_manual_form_draft(uuid,uuid,timestamptz),public.admin_save_manual_draft(uuid,uuid,jsonb,timestamptz),public.admin_load_manual_draft(uuid,uuid),public.admin_list_manual_drafts(uuid,integer,text,boolean),public.admin_delete_manual_draft(uuid,uuid,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
