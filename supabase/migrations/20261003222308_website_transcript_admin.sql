-- Existing book editor already writes this optional field; production lacked it.
alter table public.books add column if not exists reading_time_minutes integer
  check(reading_time_minutes is null or reading_time_minutes>0);
-- Descriptions based on the real chapter content; valid descriptions stay intact.
update public.books set description='After a port accountant dies, Faris Marwan is pressured to endorse financial records that accuse the dead man of theft. His investigation forces him to confront a powerful harbour circle and the witness testimony he concealed nine years earlier.'
where title='A Debt of Silence' and nullif(btrim(description),'') is null;
update public.books set description='Sentenced to life for Leah''s murder, Daniel Mercer searches the case papers for the evidence that could challenge his conviction. With his solicitor Maya Shah, he examines disputed access records while learning to navigate the pressures and unwritten rules of prison.'
where title='The Prisoner''s Proof' and nullif(btrim(description),'') is null;
-- Books currently have no draft/published state: every book is publicly listed.
alter table public.books add constraint books_meaningful_description
  check(description is not null and length(btrim(description))>=20);

-- Administrator identity must come from the authenticated server, never the form.
-- Service-only function feeds the established index in a single transaction.
create function public.admin_import_youtube_transcript(p_actor uuid,p_youtube_id text,
  p_title text,p_channel text,p_raw jsonb,p_searchable boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare v uuid; l uuid:=gen_random_uuid(); c jsonb; n integer;
begin
  if public.account_role(p_actor)<>'admin' then raise exception 'Forbidden'; end if;
  if p_youtube_id !~ '^[A-Za-z0-9_-]{11}$' or p_youtube_id is null
    or length(btrim(p_title)) not between 1 and 300 or p_title is null
    or length(coalesce(p_channel,''))>300
    or jsonb_typeof(p_raw->'content') is distinct from 'array'
    or octet_length(p_raw::text)>1048576 then raise exception 'invalid_manual_transcript'; end if;
  n:=jsonb_array_length(p_raw->'content');
  if n not between 1 and 5000 then raise exception 'invalid_manual_transcript'; end if;
  for c in select value from jsonb_array_elements(p_raw->'content') loop
    if jsonb_typeof(c->'text') is distinct from 'string' or length(btrim(c->>'text')) not between 1 and 10000
      or c->>'text' !~ '[?-?]' or jsonb_typeof(c->'offset') is distinct from 'number'
      or jsonb_typeof(c->'duration') is distinct from 'number'
      or (c->>'offset')::double precision<0 or (c->>'duration')::double precision<=0
      or (c->>'offset')::double precision+(c->>'duration')::double precision>43200000
      or (c ? 'english' and (jsonb_typeof(c->'english') is distinct from 'string' or length(c->>'english')>10000))
      then raise exception 'invalid_manual_transcript'; end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(p_youtube_id,1));
  select id into v from public.youtube_transcripts where youtube_id=p_youtube_id for update;
  if found then return v; end if; -- Never replace saved or processing canonical work.
  insert into public.youtube_transcripts(youtube_id,canonical_url,title,channel,thumbnail,
    provider,status,searchable,raw_transcript,lease_id,lease_until,duration_seconds)
  values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id,btrim(p_title),nullif(btrim(p_channel),''),
    'https://i.ytimg.com/vi/'||p_youtube_id||'/hqdefault.jpg','manual','indexing',p_searchable,
    jsonb_build_object('provider','manual','lang','ar','content',p_raw->'content'),l,now()+interval '3 minutes',
    (select max((x->>'offset')::double precision+(x->>'duration')::double precision)/1000 from jsonb_array_elements(p_raw->'content') x))
  returning id into v;
  perform public.index_youtube_transcript(v,l);
  with ordered as (select x,row_number() over(order by (x->>'offset')::double precision,ord)-1 pos
    from jsonb_array_elements(p_raw->'content') with ordinality a(x,ord))
  update public.transcript_segments s set english_text=nullif(btrim(o.x->>'english'),'')
    from ordered o where s.transcript_id=v and s.position=o.pos and s.original_text=o.x->>'text';
  update public.youtube_transcripts set translation_status=case
    when not exists(select 1 from public.transcript_segments where transcript_id=v and english_text is null) then 'ready'
    when exists(select 1 from public.transcript_segments where transcript_id=v and english_text is not null) then 'partial'
    else 'unavailable' end where id=v;
  return v;
end $$;
revoke all on function public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
