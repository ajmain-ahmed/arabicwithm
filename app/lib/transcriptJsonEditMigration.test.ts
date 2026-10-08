// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
let db:PGlite
const admin='11111111-1111-4111-8111-111111111111',id='33333333-3333-4333-8333-333333333333'
const user='22222222-2222-4222-8222-222222222222'
const version='2026-10-08T10:00:00Z'
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(String.raw`
      create role anon; create role authenticated; create role service_role;
      create schema transcript_private;
      create table roles(id uuid primary key, role text);
      insert into roles values('${admin}','admin'),('${user}','user');
      create function public.account_role(p uuid) returns text language sql as 'select role from public.roles where id=p';
      create table youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,
        canonical_url text,title text default 'Video',channel text,thumbnail text,duration_seconds double precision,
        provider text default 'supadata',status text default 'queued',searchable boolean default true,
        feed_eligible boolean default true,translation_status text default 'unavailable',episode_id uuid,
        raw_transcript jsonb,lease_id uuid,lease_until timestamptz,error_code text,updated_at timestamptz default now());
      create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts on delete cascade,
        position integer,start_seconds double precision,end_seconds double precision,original_text text,normalised_text text,english_text text);
      create table transcript_tokens(segment_id bigint references transcript_segments on delete cascade,position integer,surface text,normalised text);
      create table user_video_library(user_id uuid,transcript_id uuid references youtube_transcripts on delete cascade);
      create table transcript_private.guest_imports(transcript_id uuid references youtube_transcripts on delete cascade);
      create table transcript_private.translations(transcript_id uuid primary key references youtube_transcripts on delete cascade,
        source_hash text,status text default 'queued',error_code text);
      create table dictionary(word text); insert into dictionary values('shared');
      create table legacy_calls(id uuid);
      alter table youtube_transcripts enable row level security;
      alter table transcript_segments enable row level security;
      create function public.normalise_transcript_word(input text) returns text language sql immutable as $$
        select btrim(regexp_replace(regexp_replace(translate(normalize(input,NFKC),'أإآٱى','ااااي'),
        U&'[\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]','','g'),'[^[:alnum:]]+',' ','g'));
      $$;
      create function public.register_youtube_transcript(p_user uuid,p_youtube_id text) returns uuid language plpgsql as $$
        declare v uuid; begin insert into public.youtube_transcripts(youtube_id,canonical_url) values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id) returning id into v;
        insert into public.user_video_library values(p_user,v); return v; end $$;
      
      create function transcript_private.queue_translation() returns trigger language plpgsql as 'begin return new; end';
      create trigger transcript_translation_queue after insert or update of status on youtube_transcripts for each row execute function transcript_private.queue_translation();
      create function public.search_transcript_word(p_word text,p_after bigint default 0,p_limit integer default 20,p_after_rank integer default 0)
      returns table(segment_id bigint,transcript_id uuid,youtube_id text,title text,channel text,thumbnail text,
        duration_seconds double precision,original_text text,start_seconds double precision,end_seconds double precision,
        matched_surfaces text[],previous_text text,next_text text,previous_start double precision,next_end double precision,
        match_type text,match_rank integer,english_text text)
      language sql as $$ select s.id,t.id,t.youtube_id,t.title,t.channel,t.thumbnail,t.duration_seconds,s.original_text,s.start_seconds,s.end_seconds,
        array[k.surface],null::text,null::text,null::double precision,null::double precision,'exact'::text,0,s.english_text
        from public.transcript_tokens k join public.transcript_segments s on s.id=k.segment_id join public.youtube_transcripts t on t.id=s.transcript_id
        where k.surface=p_word and t.status='ready' and t.searchable and (0,s.id)>(p_after_rank,p_after) order by s.id limit p_limit $$;
create function public.index_youtube_transcript(p_id uuid, p_lease uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_raw jsonb; v_text text; v_letters integer; v_arabic integer;
begin
  select raw_transcript into v_raw from public.youtube_transcripts where id = p_id and lease_id = p_lease for update;
  if not found then raise exception 'lease_lost'; end if;
  if v_raw is null or jsonb_typeof(v_raw->'content') <> 'array' or jsonb_array_length(v_raw->'content') = 0 then raise exception 'malformed_transcript'; end if;
  select string_agg(c->>'text',' ') into v_text from jsonb_array_elements(v_raw->'content') c;
  v_letters := length(regexp_replace(normalize(v_text,NFKC),'[^[:alpha:]]','','g'));
  v_arabic := length(regexp_replace(normalize(v_text,NFKC),U&'[^\0621-\063A\0641-\064A\066E-\06D3]','','g'));
  if v_arabic < 3 or v_arabic::numeric / greatest(v_letters,1) < 0.1 then
    update public.youtube_transcripts set status='failed',error_code='arabic_unavailable',lease_id=null,lease_until=null,updated_at=now() where id=p_id;
    return;
  end if;
  if exists(select 1 from jsonb_array_elements(v_raw->'content') c where
    jsonb_typeof(c->'text') <> 'string' or not (c ? 'text' and c ? 'offset' and c ? 'duration') or
    (c->>'offset')::double precision < 0 or (c->>'duration')::double precision < 0 or
    (c->>'offset')::double precision + (c->>'duration')::double precision > 43200000) then raise exception 'malformed_transcript'; end if;
  delete from public.transcript_segments where transcript_id=p_id;
  insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,normalised_text)
    select p_id,(row_number() over(order by (c->>'offset')::double precision, ord)-1)::integer,
      (c->>'offset')::double precision/1000, ((c->>'offset')::double precision+(c->>'duration')::double precision)/1000,
      c->>'text',public.normalise_transcript_word(c->>'text')
    from jsonb_array_elements(v_raw->'content') with ordinality as items(c,ord);
  -- Preserve exact original token surfaces; normalisation never rewrites display.
  insert into public.transcript_tokens(segment_id,position,surface,normalised)
    select s.id,(words.ord-1)::integer,words.parts[1],public.normalise_transcript_word(words.parts[1])
    from public.transcript_segments s cross join lateral
      regexp_matches(s.original_text,U&'([[:alnum:]\0610-\061A\064B-\065F\0670\06D6-\06ED\0640]+)','g') with ordinality as words(parts,ord)
    where s.transcript_id=p_id and public.normalise_transcript_word(words.parts[1]) <> '';
  update public.youtube_transcripts set status='ready',error_code=null,lease_id=null,lease_until=null,updated_at=now() where id=p_id;
end $$;


 create function admin_record_transcript_origin(p_actor uuid,p_id uuid) returns void language sql as 'select';
 `)
 await db.exec(readFileSync('supabase/migrations/20261004100332_website_transcript_generation.sql','utf8'))
 await db.exec(String.raw`create or replace function public.admin_import_youtube_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
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
`)
 await db.exec(readFileSync('supabase/migrations/20261008133217_admin_transcript_json_edit.sql','utf8'))
 await db.query("insert into youtube_transcripts(id,youtube_id,title,channel,canonical_url,provider,status,searchable,feed_eligible,duration_seconds,updated_at,raw_transcript) values($1,'VIDEO000001','Original','Source','original-url','manual','ready',true,false,20,$2,'{}')",[id,version])
 await db.query("insert into transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,normalised_text,english_text) values($1,0,0,1,'قديم','قديم','Old')",[id])
 await db.query("insert into transcript_tokens select id,0,'قديم','قديم' from transcript_segments")
 await db.query("insert into user_video_library values($1,$2)",[admin,id])
})
afterAll(async()=>{await db?.close()})
const chunk=(text:string,offset:number)=>({text,offset,duration:2000,english:'English',sentence_id:`s${offset}`,tokens:[{ar:text,plain:text,gloss:'word',start_ms:offset,end_ms:offset+1000}]})
async function update(content:unknown[],timestamp:string=version,searchable=true){return db.query<{saved:string}>('select admin_update_transcript_json($1,$2,$3,$4,$5,$6,$7)::text saved',[admin,id,JSON.stringify({content}),'Original','Source',searchable,timestamp])}
async function snapshot(){return (await db.query('select to_jsonb(t) row from youtube_transcripts t where id=$1',[id])).rows[0]}
it('validates and authorises before replacement, preserving the saved source',async()=>{
 const before=await snapshot()
 await expect(update([{text:'مرحبا',offset:-1,duration:1}])).rejects.toThrow('millisecond interval')
 await expect(db.query('select admin_update_transcript_json($1,$2,$3,$4,$5,$6,$7)',[null,id,JSON.stringify({content:[chunk('مرحبا',0)]}),'Original','Source',true,version])).rejects.toThrow('Forbidden')
 await db.exec('set role authenticated')
 await expect(update([chunk('مرحبا',0)])).rejects.toThrow('permission denied')
 await db.exec('reset role')
 expect(await snapshot()).toEqual(before);expect((await db.query('select * from transcript_tokens')).rows[0]).toMatchObject({surface:'قديم'})
})
let saved:string
it('corrects Arabic/timing, adds and removes segments/tokens while retaining transcript identity and metadata',async()=>{
 saved=(await update([chunk('مرحبا',12345),chunk('جديد',15000)])).rows[0].saved
 const row=(await db.query('select * from youtube_transcripts where id=$1',[id])).rows[0]
 expect(row).toMatchObject({id,title:'Original',channel:'Source',canonical_url:'original-url',provider:'manual',searchable:true,feed_eligible:false,duration_seconds:20})
 expect((await db.query('select * from youtube_transcripts')).rows).toHaveLength(1)
 expect((await db.query('select * from user_video_library')).rows).toHaveLength(1)
 const segments=(await db.query('select * from transcript_segments order by position')).rows
 expect(segments).toHaveLength(2);expect(segments[0]).toMatchObject({start_ms:12345,end_ms:14345,original_text:'مرحبا',english_text:'English',canonical_paragraph:expect.objectContaining({tokens:[expect.objectContaining({arabic:'مرحبا',plain:'مرحبا',english:'word',start_ms:12345})]})})
 expect((await db.query("select * from transcript_tokens where surface='قديم'")).rows).toHaveLength(0)
 expect((await db.query("select * from transcript_tokens where surface='جديد'")).rows).toHaveLength(1)
 saved=(await update([chunk('تصحيح',2000)],saved)).rows[0].saved
 expect((await db.query('select * from transcript_segments')).rows).toHaveLength(1)
 expect((await db.query("select * from transcript_tokens where surface='جديد'")).rows).toHaveLength(0)
})
it('rolls back metadata, source and child rows if indexing fails after validation',async()=>{
 const before=await snapshot(),segments=(await db.query('select * from transcript_segments')).rows
 await db.exec("create function fail_index() returns trigger language plpgsql as $$ begin raise exception 'index_failed'; end $$; create trigger fail_index before insert on transcript_segments for each row execute function fail_index();")
 await expect(update([chunk('جديد',0)],saved)).rejects.toThrow('index_failed')
 expect(await snapshot()).toEqual(before);expect((await db.query('select * from transcript_segments')).rows).toEqual(segments)
 await db.exec('drop trigger fail_index on transcript_segments')
})
it('rejects a stale editor without replacing newer saved work',async()=>{
 const before=await snapshot();await expect(update([chunk('جديد',0)])).rejects.toThrow('transcript_edit_conflict');expect(await snapshot()).toEqual(before)
})
it('preserves generated publication opt-out, rejects missing English for published data and cancels stale translation jobs',async()=>{
 await db.query('update youtube_transcripts set website_generation=true,searchable=false where id=$1',[id])
 await db.query("insert into transcript_private.translations(transcript_id,source_hash,status) values($1,'old','ready')",[id])
 saved=(await db.query<{updated_at:string}>('select updated_at::text from youtube_transcripts where id=$1',[id])).rows[0].updated_at
 saved=(await update([chunk('جديد',0)],saved,false)).rows[0].saved
 expect((await db.query('select searchable,feed_eligible,website_generation from youtube_transcripts where id=$1',[id])).rows[0]).toEqual({searchable:false,feed_eligible:false,website_generation:true})
 expect((await db.query('select * from transcript_private.translations')).rows).toHaveLength(0)
 const before=await snapshot();await expect(update([{text:'مرحبا',offset:0,duration:1000}],saved,true)).rejects.toThrow('generation_incomplete');expect(await snapshot()).toEqual(before)
})
