-- Reuse the existing publication state. No searchable state is backfilled.
alter table public.youtube_transcripts add column if not exists explore_published boolean not null default false;
alter table transcript_private.manual_import_jobs add column requested_explore_published boolean not null default true;

-- Website-only wrappers commit content and both publication choices atomically.
create function public.website_begin_manual_import(p_actor uuid,p_key text,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean,p_explore_published boolean,p_group uuid default null,p_duration float8 default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_explore_published is null then raise exception 'For You choice required';end if;
 result:=public.admin_begin_manual_import(p_actor,p_key,p_youtube_id,p_title,p_channel,p_raw,p_searchable,p_group,p_duration);
 update transcript_private.manual_import_jobs set requested_explore_published=p_explore_published where id=(result->>'importId')::uuid and not completed;
 return result;
end $$;

create function public.website_finish_manual_import(p_actor uuid,p_import uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; job transcript_private.manual_import_jobs;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 select * into job from transcript_private.manual_import_jobs where id=p_import and actor=p_actor for update;
 if not found then raise exception 'Import not found';end if;
 result:=public.admin_finish_manual_import(p_actor,p_import);
 if not job.completed then
  update public.youtube_transcripts set explore_published=job.requested_explore_published where id=job.transcript_id;
 end if;
 return result;
end $$;

create function public.website_save_manual_source(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_explore_published boolean,p_updated_at timestamptz,p_youtube_id text,p_group uuid default null,p_duration float8 default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 if p_explore_published is null then raise exception 'For You choice required';end if;
 result:=public.admin_save_manual_source(p_actor,p_id,p_raw,p_title,p_channel,p_searchable,p_updated_at,p_youtube_id,p_group,p_duration);
 update public.youtube_transcripts set explore_published=p_explore_published where id=p_id;
 return result;
end $$;
revoke all on function public.website_begin_manual_import(uuid,text,text,text,text,jsonb,boolean,boolean,uuid,float8),public.website_finish_manual_import(uuid,uuid),public.website_save_manual_source(uuid,uuid,jsonb,text,text,boolean,boolean,timestamptz,text,uuid,float8) from public,anon,authenticated;
grant execute on function public.website_begin_manual_import(uuid,text,text,text,text,jsonb,boolean,boolean,uuid,float8),public.website_finish_manual_import(uuid,uuid),public.website_save_manual_source(uuid,uuid,jsonb,text,text,boolean,boolean,timestamptz,text,uuid,float8) to service_role;

-- Canonical video identity survives source edits, segment reindexing and reimports.
create table transcript_private.website_for_you_exclusions (
 youtube_id text not null check(youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
 start_seconds float8 not null check(start_seconds>=0),
 end_seconds float8 not null check(end_seconds>start_seconds and end_seconds<=43200),
 reason text not null, primary key(youtube_id,start_seconds,end_seconds)
);
alter table transcript_private.website_for_you_exclusions enable row level security;
revoke all on transcript_private.website_for_you_exclusions from public,anon,authenticated,service_role;
insert into transcript_private.website_for_you_exclusions values
 ('3S3cFw0hvLs',0,43200,'Excluded video requested by owner'),
 ('ru6DAbFzVio',8,57,'Complete opening theme, including final caption at 00:49'),
 ('ru6DAbFzVio',635,744,'Repeated closing theme, including final caption at 12:21');

create function transcript_private.enforce_website_for_you_segment_exclusion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from transcript_private.website_for_you_exclusions x join public.youtube_transcripts t on t.youtube_id=x.youtube_id
  where t.id=new.transcript_id and t.source_origin='website_admin_transcript' and t.episode_id is null
  and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
  and new.start_seconds<x.end_seconds and coalesce(new.end_seconds,new.start_seconds+0.001)>x.start_seconds)
 then new.for_you_manual_excluded:=true;end if;
 return new;
end $$;
revoke all on function transcript_private.enforce_website_for_you_segment_exclusion() from public,anon,authenticated,service_role;
create trigger website_for_you_segment_exclusion before insert or update on public.transcript_segments
for each row execute function transcript_private.enforce_website_for_you_segment_exclusion();

create function transcript_private.enforce_website_for_you_video_exclusion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.source_origin='website_admin_transcript' and new.episode_id is null and exists(
  select 1 from transcript_private.website_for_you_exclusions x where x.youtube_id=new.youtube_id and x.start_seconds=0 and x.end_seconds=43200)
 then new.explore_published:=false;end if;
 return new;
end $$;
revoke all on function transcript_private.enforce_website_for_you_video_exclusion() from public,anon,authenticated,service_role;
create trigger website_for_you_video_exclusion before insert or update on public.youtube_transcripts
for each row execute function transcript_private.enforce_website_for_you_video_exclusion();

update public.youtube_transcripts set explore_published=false where youtube_id='3S3cFw0hvLs' and source_origin='website_admin_transcript' and episode_id is null;
update public.transcript_segments s set for_you_manual_excluded=true from public.youtube_transcripts t,transcript_private.website_for_you_exclusions x
where s.transcript_id=t.id and t.youtube_id=x.youtube_id and t.source_origin='website_admin_transcript' and t.episode_id is null
 and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)
 and s.start_seconds<x.end_seconds and coalesce(s.end_seconds,s.start_seconds+0.001)>x.start_seconds;
