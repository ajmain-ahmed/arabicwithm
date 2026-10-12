-- Extend existing profile identity and access audit; no parallel roles/subscriptions.
begin;
-- Usernames reuse the already deployed leaderboard_public_profiles.handle
-- and authenticated set_public_handle RPC; no duplicate identifier column.

-- Retain all existing notes. Blank notes are now legitimate.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='private.manual_premium_grants'::regclass and contype='c' and pg_get_constraintdef(oid) like '%reason%' loop
  execute format('alter table private.manual_premium_grants drop constraint %I',c.conname);
 end loop;
end $$;
alter table private.manual_premium_grants add constraint manual_premium_notes_length check(length(reason)<=2000);
create or replace function public.change_account_role(p_actor uuid,p_target uuid,p_role text,p_reason text) returns void language plpgsql set search_path='' as $$
declare old_role text;
begin
 perform pg_advisory_xact_lock(73142819);
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_role is null or p_role not in ('user','editor','admin') or length(coalesce(p_reason,''))>2000 then raise exception 'Invalid access or notes'; end if;
 old_role:=public.account_role(p_target);
 if old_role=p_role then return; end if;
 if old_role='admin' and p_role<>'admin' and (select count(*) from public.account_roles where role='admin')<=1 then raise exception 'The final Admin cannot be demoted'; end if;
 insert into public.account_roles(user_id,role) values(p_target,p_role) on conflict(user_id) do update set role=excluded.role,updated_at=now();
 insert into public.access_change_audit(target_user_id,previous_role,new_role,changed_by,reason) values(p_target,old_role,p_role,p_actor,btrim(coalesce(p_reason,'')));
end $$;
create or replace function public.admin_set_manual_premium(p_actor uuid,p_target uuid,p_enabled boolean,p_reason text) returns boolean language plpgsql set search_path='' as $$
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_enabled is null or length(coalesce(p_reason,''))>2000 then raise exception 'Invalid Premium access or notes'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 insert into private.manual_premium_grants(user_id,enabled,changed_by,reason) values(p_target,p_enabled,p_actor,btrim(coalesce(p_reason,'')))
 on conflict(user_id) do update set enabled=excluded.enabled,changed_by=excluded.changed_by,reason=excluded.reason,updated_at=now();
 insert into private.manual_premium_audit(user_id,enabled,changed_by,reason) values(p_target,p_enabled,p_actor,btrim(coalesce(p_reason,'')));
 return private.has_premium(p_target);
end $$;
create function public.admin_set_account_access(p_actor uuid,p_target uuid,p_role text,p_premium boolean,p_notes text) returns jsonb language plpgsql set search_path='' as $$
declare v_manual boolean; v_notes text:=btrim(coalesce(p_notes,''));
begin
 perform pg_advisory_xact_lock(73142819);
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_target is null or p_premium is null or length(v_notes)>2000 then raise exception 'Invalid access or notes'; end if;
 -- Capture actor authorization before a possible self-demotion. This is one transaction.
 perform pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 select coalesce((select enabled from private.manual_premium_grants where user_id=p_target),false) into v_manual;
 if v_manual is distinct from p_premium or v_notes<>'' then
  perform public.admin_set_manual_premium(p_actor,p_target,p_premium,v_notes);
 end if;
 perform public.change_account_role(p_actor,p_target,p_role,v_notes);
 return jsonb_build_object('role',public.account_role(p_target),'manual',p_premium,'premium',private.has_premium(p_target));
end $$;
revoke all on function public.admin_set_account_access(uuid,uuid,text,boolean,text),public.change_account_role(uuid,uuid,text,text),public.admin_set_manual_premium(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.admin_set_account_access(uuid,uuid,text,boolean,text),public.change_account_role(uuid,uuid,text,text),public.admin_set_manual_premium(uuid,uuid,boolean,text) to service_role;

-- Keep the established raw_transcript JSONB model. Rich lexical/timing data lives
-- there; existing segments/tokens continue powering search and paginated playback.
create or replace function public.admin_import_youtube_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid; l uuid:=gen_random_uuid(); c jsonb; k jsonb; n integer; i integer:=0;
begin
 if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
 if p_youtube_id is null or p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' or p_title is null or length(btrim(p_title)) not between 1 and 300
 or length(coalesce(p_channel,''))>300 or jsonb_typeof(p_raw->'content') is distinct from 'array' or octet_length(p_raw::text)>20971520 then raise exception 'Invalid transcript or import exceeds the 20 MB budget'; end if;
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
 perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
 select id into v from public.youtube_transcripts where youtube_id=p_youtube_id for update;
 if found then perform public.admin_record_transcript_origin(p_actor,v); return v; end if;
 insert into public.youtube_transcripts(youtube_id,canonical_url,title,channel,thumbnail,provider,status,searchable,raw_transcript,lease_id,lease_until,duration_seconds)
 values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id,btrim(p_title),nullif(btrim(p_channel),''),'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg','manual','indexing',p_searchable,
 jsonb_build_object('provider','manual','lang','ar','content',p_raw->'content'),l,now()+interval '3 minutes',
 (select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x)) returning id into v;
 perform public.index_youtube_transcript(v,l);
 if not exists(select 1 from public.youtube_transcripts where id=v and status='ready') then raise exception 'Transcript could not be indexed as Arabic'; end if;
 with ordered as (select x,row_number() over(order by (x->>'offset')::double precision,ord)-1 pos from jsonb_array_elements(p_raw->'content') with ordinality a(x,ord))
 update public.transcript_segments s set english_text=nullif(btrim(o.x->>'english'),'') from ordered o where s.transcript_id=v and s.position=o.pos and s.original_text=o.x->>'text';
 update public.youtube_transcripts set translation_status=case
 when not exists(select 1 from public.transcript_segments where transcript_id=v and english_text is null) then 'ready'
 when exists(select 1 from public.transcript_segments where transcript_id=v and english_text is not null) then 'partial' else 'unavailable' end where id=v;
 perform public.admin_record_transcript_origin(p_actor,v);
 return v;
end $$;
revoke all on function public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
commit;
